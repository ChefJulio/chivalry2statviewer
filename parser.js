/*
 * parser.js - extracts stats from a Chivalry 2 FlavorStats save file.
 *
 * The file stores stats as length-prefixed, null-terminated strings each
 * followed by a little-endian int32 value. parse() scans the whole buffer
 * for that pattern and returns a flat { statName: value } object.
 */

function readInt32(data, offset)
{
    return (
        data[offset] |
        (data[offset+1] << 8) |
        (data[offset+2] << 16) |
        (data[offset+3] << 24)
    ) >>> 0;
}

function readString(data, offset)
{
    let length = readInt32(data, offset);

    offset += 4;

    let bytes = data.slice(offset, offset + length - 1);

    let text = new TextDecoder()
        .decode(bytes);

    return {
        text: text,
        next: offset + length
    };
}

function parse(buffer)
{
    const data = new Uint8Array(buffer);

    let result = {};

    let offset = 0;

    while(offset < data.length - 8) {

        let possibleLength = readInt32(data, offset);

        if(possibleLength > 0 && possibleLength < 100) {

            let start = offset + 4;

            let strBytes = data.slice(
                start,
                start + possibleLength - 1
            );

            let text =
                new TextDecoder()
                .decode(strBytes);

            // printable ASCII check
            if(/^[A-Za-z0-9_]+$/.test(text)) {

                let valueOffset =
                    start + possibleLength;

                let value =
                    readInt32(data, valueOffset);

                result[text] = value;

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
        "StrProperty",
        "IntProperty",
        "MapProperty",
        "DoubleProperty",
        "None"
    ];

    for (let key of ignore) {
        delete result[key];
    }

    return result;
}

// Allow the parser to be tested in Node
if (typeof module !== "undefined") {
    module.exports = { parse, readInt32, readString };
}
