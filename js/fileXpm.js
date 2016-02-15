/*
Copyright (c) 2016 Dmitry Brant.
http://dmitrybrant.com

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

function parseFormat(reader)
{
	var results = new ResultNode("XPM structure");
    try {
        var stream = new DataStream(reader);

        var bmpWidth = -1, bmpHeight = -1;
        var numColors = -1, charsPerPixel = -1;
        var line, lineArr;
        var i, j;

        while (!stream.eof()) {
            line = xpmReadLine(stream);
            if ((line.length == 0) || (line.indexOf("\"") == -1)) {
                continue;
            }
            lineArr = line.split(/[ \t"]+/);
            for (i = 0; i < lineArr.length; i++) {
                if (lineArr[i].length == 0) {
                    continue;
                }
                if (bmpWidth == -1) {
                    bmpWidth = parseInt(lineArr[i]);
                } else if (bmpHeight == -1) {
                    bmpHeight = parseInt(lineArr[i]);
                } else if (numColors == -1) {
                    numColors = parseInt(lineArr[i]);
                } else if (charsPerPixel == -1) {
                    charsPerPixel = parseInt(lineArr[i]);
                }
            }
            if ((bmpWidth != -1) && (bmpHeight != -1) && (numColors != -1) && (charsPerPixel != -1)) {
                break;
            }
        }

        if (bmpWidth <= 0 || bmpHeight <= 0 || bmpWidth > 32767 || bmpHeight > 32767) {
            throw "Invalid image dimensions.";
        }

        results.add("Width", bmpWidth);
        results.add("Height", bmpHeight);
        results.add("Number of colors", numColors);
        results.add("Characters per pixel", charsPerPixel);

        var colorTable = [];
        var colorIndex = 0;
        var colorName, colorValue;

        while (!stream.eof()) {
            line = xpmReadLine(stream);
            if ((line.length == 0) || (line.indexOf("\"") == -1)) {
                continue;
            }
            line = line.replace("\"", "");
            lineArr = line.split(/[ \t"]+/);
            colorName = "";
            for (i = 0; i < charsPerPixel; i++) {
                colorName += line[i];
            }
            colorValue = (0xFF << 24) >>> 0;
            for (i = 1; i < lineArr.length; i++) {
                if (lineArr[i] == "c" && lineArr.length > i + 1) {
                    colorValue = xpmParseColor(lineArr[i + 1]);
                }
            }
            colorTable[colorName] = colorValue;
            colorIndex++;
            if (colorIndex >= numColors) {
                break;
            }
        }

        var bmpDataId = reader.createImageData(bmpWidth, bmpHeight);
        var bmpData = bmpDataId.data;
        var strPtr, pixelColor;
        var x, y;

        try {
            y = 0;
            x = 0;
            while (!stream.eof()) {
                line = xpmReadLine(stream);
                if ((line.length == 0) || (line.indexOf("\"") == -1)) {
                    continue;
                }
                lineArr = line.split("\"");
                for (i = 0; i < lineArr.length; i++) {
                    if (lineArr[i].length > 0) {
                        line = lineArr[i];
                        break;
                    }
                }

                strPtr = 0;
                while (strPtr < line.length) {
                    pixelColor = colorTable[line.substring(strPtr, strPtr + charsPerPixel)];
                    if (pixelColor === undefined) {
                        pixelColor = 0;
                    }

                    bmpData[4 * (y * bmpWidth + x)] = (pixelColor >> 16) & 0xFF;
                    bmpData[4 * (y * bmpWidth + x) + 1] = (pixelColor >> 8) & 0xFF;
                    bmpData[4 * (y * bmpWidth + x) + 2] = pixelColor & 0xFF;
                    bmpData[4 * (y * bmpWidth + x) + 3] = (pixelColor >> 24) & 0xFF;

                    x++;
                    if (x >= bmpWidth) {
                        x = 0;
                        y++;
                        if (y >= bmpHeight) {
                            break;
                        }
                    }
                    strPtr += charsPerPixel;
                }
                if (y >= bmpHeight) {
                    break;
                }
            }

        } catch(e) {
            // give a partial image in case of error or eof
        }

        reader.onGetPreviewBitmap(bmpDataId);

    } catch(e) {
        console.log("Error while reading XPM: " + e);
        throw e;
    }
    return results;
}

function xpmParseColor(colorStr) {
    var ret = 0;
    if (!colorStr || colorStr.length == 0) {
        return ret;
    }
    if (colorStr.indexOf("#") == -1) {
        colorStr = xpmColorNames[colorStr];
    }
    if (colorStr !== undefined && colorStr.indexOf("#") >= 0) {
        var colStr = colorStr.replace("#", "");
        if (colStr.length == 3) {
            ret = (0xFF << 24) >>> 0;
            ret |= parseInt(colStr.substring(0, 1) + colStr.substring(0, 1), 16) << 16;
            ret |= parseInt(colStr.substring(1, 2) + colStr.substring(1, 2), 16) << 8;
            ret |= parseInt(colStr.substring(2, 3) + colStr.substring(2, 3), 16);
        } else if (colStr.length == 4) {
            ret = parseInt(colStr.substring(0, 1) + colStr.substring(0, 1), 16) << 24;
            ret |= parseInt(colStr.substring(1, 2) + colStr.substring(1, 2), 16) << 16;
            ret |= parseInt(colStr.substring(2, 3) + colStr.substring(2, 3), 16) << 8;
            ret |= parseInt(colStr.substring(3, 4) + colStr.substring(3, 4), 16);
        } else if (colStr.length == 6) {
            ret = (0xFF << 24) >>> 0;
            ret |= parseInt(colStr.substring(0, 2), 16) << 16;
            ret |= parseInt(colStr.substring(2, 4), 16) << 8;
            ret |= parseInt(colStr.substring(4, 6), 16);
        } else if (colStr.length == 8) {
            ret = parseInt(colStr.substring(0, 2), 16) << 24;
            ret |= parseInt(colStr.substring(2, 4), 16) << 16;
            ret |= parseInt(colStr.substring(4, 6), 16) << 8;
            ret |= parseInt(colStr.substring(6, 8), 16);
        } else if (colStr.length == 12) {
            ret = (0xFF << 24) >>> 0;
            ret |= parseInt(colStr.substring(0, 2), 16) << 16;
            ret |= parseInt(colStr.substring(4, 6), 16) << 8;
            ret |= parseInt(colStr.substring(8, 10), 16);
        } else if (colStr.length == 16) {
            ret = parseInt(colStr.substring(0, 2), 16) << 24;
            ret |= parseInt(colStr.substring(4, 6), 16) << 16;
            ret |= parseInt(colStr.substring(8, 10), 16) << 8;
            ret |= parseInt(colStr.substring(12, 14), 16);
        }
    }
    return ret;
}

function xpmReadLine(stream)
{
    var str = "";
    var nextChar;
    while (!stream.eof()) {
        nextChar = stream.readByte();
        if (nextChar == 0xA || nextChar == 0xD) {
            break;
        }
        str += String.fromCharCode(nextChar);
    }
    return str;
}

var xpmColorNames = {
    aliceblue: "#f0f8ff",
    antiquewhite: "#faebd7",
    aqua: "#00ffff",
    aquamarine: "#7fffd4",
    azure: "#f0ffff",
    beige: "#f5f5dc",
    bisque: "#ffe4c4",
    black: "#000000",
    blanchedalmond: "#ffebcd",
    blue: "#0000ff",
    blueviolet: "#8a2be2",
    brown: "#a52a2a",
    burlywood: "#deb887",
    cadetblue: "#5f9ea0",
    chartreuse: "#7fff00",
    chocolate: "#d2691e",
    coral: "#ff7f50",
    cornflowerblue: "#6495ed",
    cornsilk: "#fff8dc",
    crimson: "#dc143c",
    cyan: "#00ffff",
    darkblue: "#00008b",
    darkcyan: "#008b8b",
    darkgoldenrod: "#b8860b",
    darkgray: "#a9a9a9",
    darkgreen: "#006400",
    darkkhaki: "#bdb76b",
    darkmagenta: "#8b008b",
    darkolivegreen: "#556b2f",
    darkorange: "#ff8c00",
    darkorchid: "#9932cc",
    darkred: "#8b0000",
    darksalmon: "#e9967a",
    darkseagreen: "#8fbc8f",
    darkslateblue: "#483d8b",
    darkslategray: "#2f4f4f",
    darkturquoise: "#00ced1",
    darkviolet: "#9400d3",
    deeppink: "#ff1493",
    deepskyblue: "#00bfff",
    dimgray: "#696969",
    dodgerblue: "#1e90ff",
    firebrick: "#b22222",
    floralwhite: "#fffaf0",
    forestgreen: "#228b22",
    fuchsia: "#ff00ff",
    gainsboro: "#dcdcdc",
    ghostwhite: "#f8f8ff",
    gold: "#ffd700",
    goldenrod: "#daa520",
    gray: "#808080",
    green: "#008000",
    greenyellow: "#adff2f",
    honeydew: "#f0fff0",
    hotpink: "#ff69b4",
    indianred: "#cd5c5c",
    indigo: "#4b0082",
    ivory: "#fffff0",
    khaki: "#f0e68c",
    lavender: "#e6e6fa",
    lavenderblush: "#fff0f5",
    lawngreen: "#7cfc00",
    lemonchiffon: "#fffacd",
    lightblue: "#add8e6",
    lightcoral: "#f08080",
    lightcyan: "#e0ffff",
    lightgoldenrodyellow: "#fafad2",
    lightgray: "#d3d3d3",
    lightgreen: "#90ee90",
    lightpink: "#ffb6c1",
    lightsalmon: "#ffa07a",
    lightseagreen: "#20b2aa",
    lightskyblue: "#87cefa",
    lightslategray: "#778899",
    lightsteelblue: "#b0c4de",
    lightyellow: "#ffffe0",
    lime: "#00ff00",
    limegreen: "#32cd32",
    linen: "#faf0e6",
    magenta: "#ff00ff",
    maroon: "#800000",
    mediumaquamarine: "#66cdaa",
    mediumblue: "#0000cd",
    mediumorchid: "#ba55d3",
    mediumpurple: "#9370db",
    mediumseagreen: "#3cb371",
    mediumslateblue: "#7b68ee",
    mediumspringgreen: "#00fa9a",
    mediumturquoise: "#48d1cc",
    mediumvioletred: "#c71585",
    midnightblue: "#191970",
    mintcream: "#f5fffa",
    mistyrose: "#ffe4e1",
    moccasin: "#ffe4b5",
    navajowhite: "#ffdead",
    navy: "#000080",
    oldlace: "#fdf5e6",
    olive: "#808000",
    olivedrab: "#6b8e23",
    orange: "#ffa500",
    orangered: "#ff4500",
    orchid: "#da70d6",
    palegoldenrod: "#eee8aa",
    palegreen: "#98fb98",
    paleturquoise: "#afeeee",
    palevioletred: "#db7093",
    papayawhip: "#ffefd5",
    peachpuff: "#ffdab9",
    peru: "#cd853f",
    pink: "#ffc0cb",
    plum: "#dda0dd",
    powderblue: "#b0e0e6",
    purple: "#800080",
    red: "#ff0000",
    rosybrown: "#bc8f8f",
    royalblue: "#4169e1",
    saddlebrown: "#8b4513",
    salmon: "#fa8072",
    sandybrown: "#f4a460",
    seagreen: "#2e8b57",
    seashell: "#fff5ee",
    sienna: "#a0522d",
    silver: "#c0c0c0",
    skyblue: "#87ceeb",
    slateblue: "#6a5acd",
    slategray: "#708090",
    snow: "#fffafa",
    springgreen: "#00ff7f",
    steelblue: "#4682b4",
    tan: "#d2b48c",
    teal: "#008080",
    thistle: "#d8bfd8",
    tomato: "#ff6347",
    turquoise: "#40e0d0",
    violet: "#ee82ee",
    wheat: "#f5deb3",
    white: "#ffffff",
    whitesmoke: "#f5f5f5",
    yellow: "#ffff00",
    yellowgreen: "#9acd32"
};
