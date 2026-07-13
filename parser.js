/*
 * parser.js - extracts stats from a Chivalry 2 FlavorStats save file.
 *
 * The file is a small Unreal Engine property tree:
 *
 *   [4 zero bytes]
 *   UserChangelist        IntProperty                     (build metadata)
 *   FlavorStats           MapProperty<Str, Int32>         (the stats)
 *   AchievementProgressEx MapProperty<Str, Double>        (challenge flags)
 *   None                                                  (terminator)
 *
 * parse() walks that structure and returns a flat { statName: value }
 * object merged from all maps. If the structure ever changes, it falls
 * back to a heuristic scan for string/int32 pairs (which cannot read
 * double values correctly, but degrades gracefully).
 */

function parseStructured(data)
{
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);

    let offset = 4; // 4-byte header prefix

    function readStr()
    {
        const length = dv.getInt32(offset, true);
        offset += 4;

        if (length <= 0 || offset + length > data.length)
            throw new Error("bad string length " + length + " at " + offset);

        const text = new TextDecoder()
            .decode(data.slice(offset, offset + length - 1));

        offset += length;
        return text;
    }

    function readValue(type)
    {
        let value;
        switch (type)
        {
            case "IntProperty":
                value = dv.getUint32(offset, true);
                offset += 4;
                return value;

            case "DoubleProperty":
                value = dv.getFloat64(offset, true);
                offset += 8;
                return value;

            case "StrProperty":
                return readStr();

            default:
                throw new Error("unsupported value type " + type);
        }
    }

    const result = {};
    let mapsParsed = 0;

    while (offset < data.length - 4)
    {
        const name = readStr();
        if (name === "None")
            break;

        const type = readStr();
        offset += 4; // payload size
        offset += 4; // array index

        if (type === "MapProperty")
        {
            const keyType = readStr();
            const valueType = readStr();
            offset += 1; // guid flag
            offset += 4; // num keys to remove

            if (keyType !== "StrProperty")
                throw new Error("unsupported map key type " + keyType);

            const count = dv.getInt32(offset, true);
            offset += 4;

            for (let i = 0; i < count; i++)
            {
                const key = readStr();
                result[key] = readValue(valueType);
            }
            mapsParsed++;
        }
        else
        {
            offset += 1; // guid flag
            readValue(type); // scalar metadata (e.g. UserChangelist) - skip
        }
    }

    if (mapsParsed === 0)
        throw new Error("no stat maps found");

    return result;
}

// Fallback: scan for length-prefixed strings followed by int32 values.
function parseHeuristic(data)
{
    const result = {};
    let offset = 0;

    while (offset < data.length - 8)
    {
        const possibleLength = (
            data[offset] |
            (data[offset + 1] << 8) |
            (data[offset + 2] << 16) |
            (data[offset + 3] << 24)
        ) >>> 0;

        if (possibleLength > 0 && possibleLength < 100)
        {
            const start = offset + 4;
            const text = new TextDecoder()
                .decode(data.slice(start, start + possibleLength - 1));

            if (/^[A-Za-z0-9_]+$/.test(text))
            {
                const valueOffset = start + possibleLength;
                result[text] = (
                    data[valueOffset] |
                    (data[valueOffset + 1] << 8) |
                    (data[valueOffset + 2] << 16) |
                    (data[valueOffset + 3] << 24)
                ) >>> 0;

                offset = valueOffset + 4;
                continue;
            }
        }

        offset++;
    }

    // serialization metadata picked up by the scan, not real stats
    const ignore = [
        "UserChangelist",
        "FlavorStats",
        "AchievementProgressEx",
        "StrProperty",
        "IntProperty",
        "MapProperty",
        "DoubleProperty",
        "None"
    ];

    for (const key of ignore)
        delete result[key];

    return result;
}

function parse(buffer)
{
    const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    try
    {
        return parseStructured(data);
    }
    catch (e)
    {
        console.warn("Structured parse failed (" + e.message + "), using heuristic scan");
        return parseHeuristic(data);
    }
}

// Allow the parser to be tested in Node
if (typeof module !== "undefined") {
    module.exports = { parse, parseStructured, parseHeuristic };
}
