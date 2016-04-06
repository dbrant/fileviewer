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
    return parseJpgStructure(reader);
}

function parseJpgStructure(reader, offset)
{
    var results = new ResultNode("JPEG structure");

    try {
        var stream = new DataStream(reader);
        if (offset !== undefined) {
            stream.seek(offset, 0);
        }

        var segmentStart;
        var segmentType;
        var segmentLength = 0;
        var scanStarted = false;
        var i, node, subNode;

        while (!stream.eof()) {

            //read bytes until we get an FF
            while (true) {
                segmentStart = stream.readByte();
                if (segmentStart == 0xFF) {
                    break;
                }
            }

            //read any number of FF bytes
            if (!scanStarted) {
                while (true) {
                    segmentType = stream.readByte();
                    if (segmentType != 0xFF) break;
                }
            }
            else {
                segmentType = stream.readByte();
                if (segmentType != 0) {
                    if ((segmentType < 0xC0) || (segmentType == 0xFF)) {
                        throw "Invalid segment type in Jpg file...";
                    }
                }
                else {
                    continue;
                }
            }

            //is it the ending segment?
            if (segmentType == 0xD9) {
                results.add(getJpgSegmentName(segmentType));
                break;
            }
            if (segmentType < 0xC0)
            {
                throw "Invalid segment type in Jpg file.";
            }
            if (segmentType == 0xDA) {
                scanStarted = true;
            }

            //check for segments that don't have a length associated with them
            if ((segmentType == 0x01) || ((segmentType >= 0xD0) && (segmentType <= 0xD8)))
            {
                if (segmentType == 0xD8) {
                    results.add(getJpgSegmentName(segmentType));
                }
            }
            else
            {
                //read the length of the segment
                segmentLength = stream.readUShortBe();

                node = results.add(getJpgSegmentName(segmentType), segmentLength.toString() + " bytes");

                segmentLength -= 2;
                if (segmentLength == 0) continue;
                if (segmentLength > 65533)
                {
                    throw "Invalid segment length in Jpg file.";
                }

                var position = stream.position;
                stream.skip(segmentLength);

                //if it's data we can use, pass it for processing!
                if ((segmentType >= 0xE0) && (segmentType <= 0xEF))
                {
                    if ((reader.getAsciiStringAt(position, 4) == "Exif")
                        && (((reader.byteAt(position + 6) == 0x4D) && (reader.byteAt(position + 7) == 0x4D)) || ((reader.byteAt(position + 6) == 0x49) && (reader.byteAt(position + 7) == 0x49))))
                    {
                        tiffReadStream(reader, position + 6, node, false);
                    }
                    else if (((reader.byteAt(position) == 0x4D) && (reader.byteAt(position + 1) == 0x50) && (reader.byteAt(position + 2) == 0x46) && (reader.byteAt(position + 3) == 0))
                        && (((reader.byteAt(position + 4) == 0x4D) && (reader.byteAt(position + 5) == 0x4D)) || ((reader.byteAt(position + 4) == 0x49) && (reader.byteAt(position + 5) == 0x49))))
                    {
                        var mpoStream = new DataStream(reader, position + 4);
                        var mpoTagList = getTiffInfo(mpoStream, IfdTagMPF);
                        for (i = 0; i < mpoTagList.length; i++) {
                            node.add("[0x" + mpoTagList[i].tagID.toString(16).toUpperCase() + "] " + getTiffTagName(mpoTagList[i].tagID, mpoTagList[i].ifdTag, mpoTagList[i].makerNoteType), mpoTagList[i].tagContents);
                        }
                    }
                    else if ((segmentType == 0xE0) && (((reader.byteAt(position) == 0x4D) && (reader.byteAt(position + 1) == 0x4D)) || ((reader.byteAt(position) == 0x49) && (reader.byteAt(position + 1) == 0x49))))
                    {
                        //handle CIFF?
                    }
                    else if ((segmentType == 0xEC) && (reader.getAsciiStringAt(position, 5) == "Ducky"))
                    {
                        //handle Ducky...
                        var duckyPtr = 5;
                        try
                        {
                            subNode = node.add("Ducky");
                            while (duckyPtr < segmentLength)
                            {
                                var duckTag = reader.ushortBeAt(position + duckyPtr); duckyPtr += 2;
                                var duckLen = reader.ushortBeAt(position + duckyPtr); duckyPtr += 2;
                                if (duckLen < 4096)
                                {
                                    if (duckTag == 1)
                                    {
                                        subNode.add("Quality", reader.uintBeAt(position + duckyPtr));
                                    }
                                    else if (duckTag == 2)
                                    {
                                        subNode.add("Comment", reader.getAsciiStringAt(position + duckyPtr, duckLen));
                                    }
                                    else if (duckTag == 3)
                                    {
                                        subNode.add("Copyright", reader.getAsciiStringAt(position + duckyPtr, duckLen));
                                    }
                                }
                                duckyPtr += duckLen;
                            }
                        } catch(e) {
                            console.log("Error while reading Ducky: " + e);
                        }
                    }
                    else if ((segmentType == 0xE0) && (reader.getAsciiStringAt(position, 4) == "JFIF"))
                    {
                        subNode = node.add("JFIF");
                        subNode.add("Version", reader.byteAt(position + 5).toString() + "." + reader.byteAt(position + 6).toString());
                        var dUnits = reader.byteAt(position + 7) == 0 ? "" : reader.byteAt(position + 7) == 1 ? "dpi" : "dpcm";
                        var xDens = reader.ushortBeAt(position + 8);
                        var yDens = reader.ushortBeAt(position + 10);
                        subNode.add("Horizontal density", xDens.toString() + " " + dUnits);
                        subNode.add("Vertical density", yDens.toString() + " " + dUnits);
                    }
                    else if ((segmentType == 0xED) && (reader.getAsciiStringAt(position, 9) == "Photoshop"))
                    {
                        subNode = node.add("Image resources", reader.getAsciiStringAt(position, 13));
                        psdParseImageResources(reader, subNode, position + 14, segmentLength - 14);
                    }
                }
                else if (segmentType == 0xFE) {
                    var commentStr = reader.getAsciiStringAt(position, segmentLength);
                    node.add("Comment", commentStr);
                }
            }
        }
    } catch(e) {
        console.log("Error while reading JPG: " + e);
    }
    return results;
}

function getJpgSegmentStr(id)
{
    switch (id)
    {
        case 0x01: return "TEM";
        case 0xC0: return "SOF0";
        case 0xC1: return "SOF1";
        case 0xC2: return "SOF2";
        case 0xC3: return "SOF3";
        case 0xC4: return "DHT";
        case 0xC5: return "SOF5";
        case 0xC6: return "SOF6";
        case 0xC7: return "SOF7";
        case 0xC8: return "JPG";
        case 0xC9: return "SOF9";
        case 0xCA: return "SOF10";
        case 0xCB: return "SOF11";
        case 0xCC: return "DAC";
        case 0xCD: return "SOF13";
        case 0xCE: return "SOF14";
        case 0xCF: return "SOF15";
        case 0xD0: return "RST0";
        case 0xD1: return "RST1";
        case 0xD2: return "RST2";
        case 0xD3: return "RST3";
        case 0xD4: return "RST4";
        case 0xD5: return "RST5";
        case 0xD6: return "RST6";
        case 0xD7: return "RST7";
        case 0xD8: return "SOI";
        case 0xD9: return "EOI";
        case 0xDA: return "SOS";
        case 0xDB: return "DQT";
        case 0xDC: return "DNL";
        case 0xDD: return "DRI";
        case 0xDE: return "DHP";
        case 0xDF: return "EXP";
        case 0xE0: return "APP0";
        case 0xE1: return "APP1";
        case 0xE2: return "APP2";
        case 0xE3: return "APP3";
        case 0xE4: return "APP4";
        case 0xE5: return "APP5";
        case 0xE6: return "APP6";
        case 0xE7: return "APP7";
        case 0xE8: return "APP8";
        case 0xE9: return "APP9";
        case 0xEA: return "APP10";
        case 0xEB: return "APP11";
        case 0xEC: return "APP12";
        case 0xED: return "APP13";
        case 0xEE: return "APP14";
        case 0xEF: return "APP15";
        case 0xF0: return "JPG0";
        case 0xFD: return "JPG13";
        case 0xFE: return "COM";
    }
    return "Unknown";
}

function getJpgSegmentName(id) {
    return getJpgSegmentStr(id) + " (0x" + id.toString(16).toUpperCase() + ")";
}
