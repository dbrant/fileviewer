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
	var results = new ResultNode("GIF structure");
	try {
		var stream = new DataStream(reader);
        var blockSize, colorTableSize, colorTableBytes;

        var gifMagic = stream.readAsciiString(6);
        if (gifMagic.indexOf("GIF") < 0) {
            return;
        }
        results.add("GIF Version", gifMagic);

        var gifWidth = stream.readShortLe();
        var gifHeight = stream.readShortLe();
        var gifFlags = stream.readByte();
        stream.skip(2);

        if ((gifFlags & 0x80) != 0) {
            //we have a color table...
            colorTableSize = (gifFlags & 0x7);
            colorTableBytes = 3 * (1 << (colorTableSize + 1));
            stream.skip(colorTableBytes);
            results.add("Color table", colorTableBytes.toString() + " bytes");
        }

        while (!stream.eof()) {
            var typeByte = stream.readByte();
            var node = results.add("Block 0x" + typeByte.toString(16).toUpperCase());

            if (typeByte == 0x21) {
                //extension...
                var extType = stream.readByte();
                var subnode = node.add("Extension 0x" + extType.toString(16).toUpperCase());

                if (extType == 0xF9) {
                    blockSize = stream.readByte();
                    stream.skip(blockSize);
                    gifReadSubBlocks(stream);

                } else if (extType == 0xFE) {
                    subnode.add("Comment", gifReadSubBlocks(stream, true));

                } else if (extType == 0x1) {
                    blockSize = stream.readByte();
                    stream.skip(blockSize);
                    subnode.add("Text data", gifReadSubBlocks(stream, true));

                } else if (extType == 0xFF) {
                    blockSize = stream.readByte();
                    var appIdStrLen = blockSize;
                    var appIdStr = "";
                    if (appIdStrLen > 8) {
                        appIdStr = stream.readAsciiString(8);
                        stream.skip(appIdStrLen - 8);
                    } else {
                        appIdStr = stream.readAsciiString(appIdStrLen);
                    }
                    if (appIdStr.length > 0) {
                        subnode.add("Application ID", appIdStr);
                    }
                    subnode.add("Application data", gifReadSubBlocks(stream, true));

                } else {
                    break;
                }

            } else if (typeByte == 0x2C) {
                //image data...
                stream.skip(4);
                var imgWidth = stream.readShortLe();
                var imgHeight = stream.readShortLe();
                var imgFlags = stream.readByte();
                node.add("Width", imgWidth);
                node.add("Height", imgWidth);

                if ((imgFlags & 0x80) != 0) {
                    //local color table...
                    colorTableSize = (imgFlags & 0x7);
                    colorTableBytes = 3 * (1 << (colorTableSize + 1));
                    node.add("Color table", colorTableBytes.toString() + " bytes");
                    stream.skip(colorTableBytes);
                }
                var minLzwSize = stream.readByte();
                gifReadSubBlocks(stream);

            } else if (typeByte == 0x3B) {
                //done!
                break;
            } else {
                //unrecognized chunk / malformed data
                break;
            }
        }

	} catch(e) {
		console.log("Error while reading GIF: " + e);
	}
	return results;
}

function gifReadSubBlocks(stream, wantString) {
    var blockLen = 0;
    var retStr = "";
    do {
        blockLen = stream.readByte();
        if (blockLen > 0) {
            if (blockLen < 1024 && wantString) {
                if (retStr.length > 0) {
                    retStr += ", ";
                }
                retStr += stream.readAsciiString(blockLen);
            } else {
                stream.skip(blockLen);
            }
        }
    } while (blockLen > 0);
    return retStr;
}