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
	var results = new ResultNode("PNM structure");
    try {
        var stream = new DataStream(reader);
        var pnmType, commentLine;
        var bmpWidth = -1, bmpHeight = -1, bmpMaxVal = -1;
        var i, token;

        pnmType = pnmReadToken(stream);
        if (pnmType != "P1" && pnmType != "P2" && pnmType != "P3" && pnmType != "P4" && pnmType != "P5" && pnmType != "P6") {
            throw "Unrecognized bitmap type.";
        }
        // if it's monochrome, it won't have a maxval, so set it to 1
        if ((pnmType == "P1") || (pnmType == "P4")) {
            bmpMaxVal = 1;
        }

        while (!stream.eof()) {
            token = pnmReadToken(stream);
            if (token.length == 0) {
                continue;
            }
            if (token.indexOf("#") == 0) {
                commentLine = pnmReadLine(stream);
                results.add("Comment", commentLine);
                continue;
            }
            if (bmpWidth == -1) {
                bmpWidth = parseInt(token);
            }
            else if (bmpHeight == -1) {
                bmpHeight = parseInt(token);
            }
            else if (bmpMaxVal == -1) {
                bmpMaxVal = parseInt(token);
            }
            //check if we have all necessary attributes
            if ((bmpWidth != -1) && (bmpHeight != -1) && (bmpMaxVal != -1)) {
                break;
            }
        }

        if (bmpWidth <= 0 || bmpHeight <= 0 || bmpMaxVal <= 0) {
            throw "Invalid image dimensions.";
        }

        results.add("Width", bmpWidth);
        results.add("Height", bmpHeight);
        results.add("Max pixel value", bmpMaxVal);

        var bmpDataId = reader.createImageData(bmpWidth, bmpHeight);
        var bmpData = bmpDataId.data;

        try {
            var numPixels = bmpWidth * bmpHeight;
            var maxElementCount = numPixels * 4;
            var elementCount, elementMod, elementVal;

            if (pnmType == "P1") {
                elementCount = 0;
                while (!stream.eof()) {
                    token = pnmReadToken(stream);
                    if (token.length == 0) {
                        continue;
                    }
                    if (token.indexOf("#") == 0) {
                        commentLine = pnmReadLine(stream);
                        results.add("Comment", commentLine);
                        continue;
                    }
                    elementVal = parseInt(token) == 0 ? 255 : 0;
                    bmpData[elementCount++] = elementVal;
                    bmpData[elementCount++] = elementVal;
                    bmpData[elementCount++] = elementVal;
                    bmpData[elementCount++] = 255;
                    if (elementCount >= maxElementCount) {
                        break;
                    }
                }
            }
            else if (pnmType == "P2") {
                elementCount = 0;
                while (!stream.eof()) {
                    token = pnmReadToken(stream);
                    if (token.length == 0) {
                        continue;
                    }
                    if (token.indexOf("#") == 0) {
                        commentLine = pnmReadLine(stream);
                        results.add("Comment", commentLine);
                        continue;
                    }
                    elementVal = parseInt(token) * 255 / bmpMaxVal;
                    bmpData[elementCount++] = elementVal;
                    bmpData[elementCount++] = elementVal;
                    bmpData[elementCount++] = elementVal;
                    bmpData[elementCount++] = 255;
                    if (elementCount >= maxElementCount) {
                        break;
                    }
                }
            }
            else if (pnmType == "P3") {
                elementCount = 0;
                elementMod = 0;
                while (!stream.eof()) {
                    token = pnmReadToken(stream);
                    if (token.length == 0) {
                        continue;
                    }
                    if (token.indexOf("#") == 0) {
                        commentLine = pnmReadLine(stream);
                        results.add("Comment", commentLine);
                        continue;
                    }
                    bmpData[elementCount + elementMod] = parseInt(token) * 255 / bmpMaxVal;
                    elementMod++;
                    if (elementMod > 2) {
                        elementCount += 4;
                        elementMod = 0;
                        bmpData[elementCount + 3] = 255;
                    }
                    if (elementCount >= maxElementCount) {
                        break;
                    }
                }
            }
            else if (pnmType == "P4") {
                elementCount = 0;
                var pixelBits;
                while (true) {
                    pixelBits = stream.readByte();
                    for (i = 7; i >= 0; i--)
                    {
                        elementVal = ((pixelBits & (1 << i)) == 0 ? 255 : 0);
                        bmpData[elementCount++] = elementVal;
                        bmpData[elementCount++] = elementVal;
                        bmpData[elementCount++] = elementVal;
                        bmpData[elementCount++] = 255;
                        if (elementCount >= maxElementCount) { break; }
                    }
                    if (elementCount >= maxElementCount) { break; }
                }
            }
            else if (pnmType == "P5") {
                elementCount = 0;
                if (bmpMaxVal < 256)
                {
                    for (i = 0; i < numPixels; i++)
                    {
                        elementVal = stream.readByte();
                        bmpData[elementCount++] = elementVal;
                        bmpData[elementCount++] = elementVal;
                        bmpData[elementCount++] = elementVal;
                        bmpData[elementCount++] = 255;
                    }
                }
                else if (bmpMaxVal < 65536)
                {
                    for (i = 0; i < numPixels; i++)
                    {
                        elementVal = stream.readByte();
                        stream.readByte();
                        bmpData[elementCount++] = elementVal;
                        bmpData[elementCount++] = elementVal;
                        bmpData[elementCount++] = elementVal;
                        bmpData[elementCount++] = 255;
                    }
                }
            }
            else if (pnmType == "P6") {
                elementCount = 0;
                if (bmpMaxVal < 256)
                {
                    for (i = 0; i < numPixels; i++)
                    {
                        bmpData[elementCount++] = stream.readByte();
                        bmpData[elementCount++] = stream.readByte();
                        bmpData[elementCount++] = stream.readByte();
                        bmpData[elementCount++] = 255;
                    }
                }
                else if (bmpMaxVal < 65536)
                {
                    for (i = 0; i < numPixels; i++)
                    {
                        bmpData[elementCount++] = stream.readByte();
                        stream.readByte();
                        bmpData[elementCount++] = stream.readByte();
                        stream.readByte();
                        bmpData[elementCount++] = stream.readByte();
                        stream.readByte();
                        bmpData[elementCount++] = 255;
                    }
                }
            }

        } catch(e) {
            // give a partial image in case of error or eof
        }

        reader.onGetPreviewBitmap(bmpDataId);

    } catch(e) {
        console.log("Error while reading PNM: " + e);
    }
    return results;
}

function pnmReadToken(stream)
{
    var str = "";
    var nextChar;
    var tokenStarted = false;
    while (!stream.eof() && str.length < 16) {
        nextChar = stream.readByte();
        if (nextChar == 0x9 || nextChar == 0x20 || nextChar == 0xA || nextChar == 0xD) {
            if (tokenStarted) {
                break;
            }
        } else {
            tokenStarted = true;
            str += String.fromCharCode(nextChar);
        }
    }
    return str;
}

function pnmReadLine(stream)
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
