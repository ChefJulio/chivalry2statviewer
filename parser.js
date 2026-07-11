console.log("parser.js loaded");

// function readInt32(data, offset)
// {
//     return (
//         data[offset] |
//         (data[offset+1] << 8) |
//         (data[offset+2] << 16) |
//         (data[offset+3] << 24)
//     );
// }


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
        text:text,
        next:offset + length
    };
}

function readProperty(data, offset)
{
    let name = readString(data, offset);

    offset = name.next;


    if(name.text === "None")
    {
        return {
            name:"None",
            next:offset
        };
    }


    let type = readString(data, offset);

    offset = type.next;


    let size = readInt32(data, offset);
    offset += 4;


    let arrayIndex = readInt32(data, offset);
    offset += 4;


    console.log(
        "PROPERTY",
        name.text,
        type.text,
        "size",
        size
    );


    let value;


    switch(type.text)
    {

        case "IntProperty":

            value = readInt32(data, offset);

            break;



        case "DoubleProperty":

            value = new DataView(
                data.buffer
            )
            .getFloat64(offset,true);

            break;



        case "StrProperty":

            value = readString(data,offset).text;

            break;



        case "MapProperty":

            value = readMap(
                data,
                offset
            );

            break;



        default:

            value =
            "[Unsupported "+type.text+"]";

            break;
    }


    return {

        name:name.text,

        value:value,

        next:offset + size

    };
}

function readMap(data,offset)
{
    let result={};


    // number of entries
    let count = readInt32(data,offset);

    offset +=4;


    console.log(
        "MAP ENTRIES:",
        count
    );


    for(let i=0;i<count;i++)
    {

        let key = readString(data,offset);

        offset = key.next;


        let value = readInt32(
            data,
            offset
        );

        offset +=4;


        result[key.text]=value;
    }


    return result;
}

function parse(buffer) {

    console.log("parse() started");

    const data = new Uint8Array(buffer);

    let result = {};

    let offset = 0;


    while(offset < data.length - 8) {

        let possibleLength = readInt32(data, offset);


        // sanity check for string length
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
                    readInt32(data,valueOffset);


                console.log(
                    text,
                    "=",
                    value,
                    "at",
                    offset
                );


                result[text]=value;


                offset = valueOffset + 4;

                continue;
            }
        }


        offset++;
    }

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

// function parseMapProperty(data, offset)
// {
//     let result={};


//     // skip map size/hash information
//     offset += 8;


//     // key property
//     let keyType = readString(data, offset);
//     offset = keyType.next;


//     // value property
//     let valueType = readString(data, offset);
//     offset = valueType.next;


//     console.log(
//         "Map:",
//         keyType.text,
//         valueType.text,
//         "at",
//         offset
//     );


//     while(offset < data.length-8)
//     {
//         let key = readString(data, offset);
//         offset = key.next;


//         if(!key.text)
//             break;


//         let value = readInt32(data, offset);
//         offset += 4;


//         result[key.text]=value;
//     }
  
//     return result;
// }

function readMapProperty(data, offset)
{
    let result={};


    // map count
    let count = readInt32(data, offset);

    offset += 4;


    // skip unknown map data
    offset += 4;



    let keyType = readString(data, offset);

    offset = keyType.next;



    let valueType = readString(data, offset);

    offset = valueType.next;



    console.log(
        "MAP",
        keyType.text,
        valueType.text,
        count
    );



    for(let i=0;i<count;i++)
    {
        let key = readString(data, offset);

        offset = key.next;


        let value;


        if(valueType.text === "DoubleProperty")
        {
            value =
                new DataView(data.buffer)
                .getFloat64(
                    offset,
                    true
                );

            offset += 8;
        }
        else
        {
            value = readInt32(data,offset);

            offset += 4;
        }


        result[key.text]=value;
    }


    return result;
}

function readProperty(data, offset)
{
    let name = readString(data, offset);

    if(!name.text)
        return null;


    offset = name.next;


    let type = readString(data, offset);

    if(!type.text)
        return null;


    offset = type.next;


    let size = readInt32(data, offset);

    offset += 4;


    let value;


    switch(type.text)
    {

        case "IntProperty":

            value = readInt32(data, offset);

            break;


        case "DoubleProperty":

            value =
                new DataView(
                    data.buffer
                )
                .getFloat64(
                    offset,
                    true
                );

            break;



        case "MapProperty":

            value =
                readMapProperty(
                    data,
                    offset
                );

            break;



        default:

            console.log(
                "Unsupported property:",
                type.text
            );

            value =
            "[Unsupported " + type.text + "]";
    }



    return {
        name:name.text,
        type:type.text,
        value:value,
        next:offset + size
    };
}


function parseIntMap(data, offset)
{
    let result={};

    // skip map header
    offset += 8;


    while(offset < data.length-4)
    {
        let key = readString(data, offset);

        offset = key.next;


        if(!key.text)
            break;


        let value = readInt32(data, offset);

        offset += 4;


        result[key.text]=value;
    }


    return {
        data:result,
        next:offset
    };
}

function renderStats(stats)
{
    let html="";


    for(let key in stats)
    {

        let value=stats[key];


        if(typeof value==="object")
            continue;


        html += `
        <div class="stat">
            <span>${key}</span>
            <b>${value}</b>
        </div>
        `;
    }


    document.getElementById("output")
    .innerHTML=html;
}

document
.getElementById("file")
.addEventListener("change", e=>{

    let file=e.target.files[0];

    let reader=new FileReader();

    reader.onload=function(){

    console.log("File loaded");

    let bytes=new Uint8Array(reader.result);

    console.log("File size:", bytes.length);

    let output=parse(bytes);

    console.log("Parser output:", output);

    renderStats(output);

};
    reader.readAsArrayBuffer(file);

});
