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
	var results = new ResultNode("PSD structure");
	try {
		var stream = new DataStream(reader);
        var node;
        var tempByte;

        var resolutionInfo = {};
        var displayInfo = {};
        var thumbnailInfo = {};
        var globalAngle;
        var colorCount;
        var transparentIndex;

        if (stream.readAsciiString(4) != "8BPS") {
            throw "This is not a valid PSD file.";
        }
        if (stream.readUShortBe() != 1) {
            throw "Only version-1 PSD files are supported.";
        }

        stream.seek(6, 1);
        var numChannels = stream.readUShortBe();
        var imgHeight = stream.readUIntBe();
        var imgWidth = stream.readUIntBe();
        var imgBpp = stream.readUShortBe();
        var colorMode = stream.readUShortBe();

        if ((imgWidth < 1) || (imgHeight < 1) || (imgWidth > 32767) || (imgHeight > 32767)) {
            throw "This PSD file appears to have invalid dimensions.";
        }

        results.add("Width", imgWidth);
        results.add("Height", imgHeight);
        results.add("Number of channels", numChannels);
        results.add("Bits per pixel", imgBpp);
        node = results.add("Color mode", colorMode);

        var colorModeLength = stream.readUIntBe();
        node.add("Length", colorModeLength);

        var colorModePtr = stream.position;
        stream.seek(colorModeLength, 1);

        var imageResourceLength = stream.readUIntBe();
        var imageResourcePtr = stream.position;
        while (!stream.eof() && (stream.position - imageResourcePtr) < imageResourceLength) {
            var imgResType = stream.readAsciiString(4);
            if (imgResType != "8BIM" && imgResType != "PHUT") {
                break;
            }

            var imgResId = stream.readUShortBe();
            var sizeOfName = stream.readByte();
            if (sizeOfName > 0) {
                if (sizeOfName % 2 != 0) {
                    stream.seek(1, 1);
                }

                var imgResName = stream.readAsciiString(sizeOfName);
            }

            stream.skip(1, 1);

            var imgResSize = stream.readUIntBe();
            if (imgResSize % 2 != 0) {
                imgResSize++;
            }

            node = results.add("Image resource (" + imgResType + ")", imgResId);
            node.add("Size of name", sizeOfName);
            node.add("Total size", imgResSize);

            switch (imgResId) {
                case 1005:
                    resolutionInfo.hRes = stream.readUShortBe();
                    resolutionInfo.hResUnit = stream.readUIntBe();
                    resolutionInfo.widthUnit = stream.readUShortBe();
                    resolutionInfo.vRes = stream.readUShortBe();
                    resolutionInfo.vResUnit = stream.readUIntBe();
                    resolutionInfo.heightUnit = stream.readUShortBe();
                    break;
                case 1007:
                    displayInfo.colorSpace = stream.readUShortBe();
                    displayInfo.color = [];
                    displayInfo.color[0] = stream.readUShortBe();
                    displayInfo.color[1] = stream.readUShortBe();
                    displayInfo.color[2] = stream.readUShortBe();
                    displayInfo.color[3] = stream.readUShortBe();
                    displayInfo.opacity = stream.readUShortBe();
                    if (displayInfo.opacity > 100) {
                        displayInfo.opacity = 100;
                    }
                    tempByte = stream.readByte();
                    displayInfo.kind = (tempByte != 0);
                    stream.skip(1, 1);
                    break;
                case 1034:
                    var copyright = stream.readUShortBe();
                    // != 0 -> copyrighted?
                    break;
                case 1033:
                case 1036:
                    thumbnailInfo.position = stream.position;
                    thumbnailInfo.format = stream.readUIntBe();
                    thumbnailInfo.width = stream.readUIntBe();
                    thumbnailInfo.height = stream.readUIntBe();
                    thumbnailInfo.widthBytes = stream.readUIntBe();
                    thumbnailInfo.size = stream.readUIntBe();
                    thumbnailInfo.compressedSize = stream.readUIntBe();
                    thumbnailInfo.bitsPerPixel = stream.readUShortBe();
                    thumbnailInfo.numPlanes = stream.readUShortBe();

                    var thumbOffset = stream.position;
                    if (stream.reader.byteAt(thumbOffset) == 0xFF && stream.reader.byteAt(thumbOffset + 1) == 0xD8) {
                        // very likely a JPEG thumbnail
                        var thumbString = "data:image/png;base64," + base64FromArrayBuffer(reader.dataView.buffer, thumbOffset, thumbnailInfo.size);
                        var thumbHtml = "<img class='previewImage' src='" + thumbString + "' />";
                        node.add("Thumbnail", thumbHtml);
                        reader.onGetPreviewImage(thumbString);
                        node.addResult(parseJpgStructure(reader, thumbOffset));
                    }

                    // skip over the rest
                    stream.skip(imgResSize - 28, 1);

                    break;
                case 1037:
                    globalAngle = stream.readUIntBe();
                    break;
                case 1046:
                    colorCount = stream.readUIntBe();
                    break;
                case 1047:
                    transparentIndex = stream.readUIntBe();
                    break;
                default:
                    stream.seek(imgResSize, 1);
                    break;
            }
        }


        // layer and mask info
        var layerAndMaskLength = stream.readUIntBe();
        stream.seek(layerAndMaskLength, 1);
        node = results.add("Layer and mask section");
        node.add("Length", layerAndMaskLength.toString(16));


        var compression = stream.readUShortBe();
        results.add("Compression", compression);


        //var bmpDataId = reader.createImageData(imgWidth, imgHeight);
        //var bmpData = bmpDataId.data;

        try {

        } catch(e) {
            // give a partial image, in case of error or eof
        }

        //reader.onGetPreviewBitmap(bmpDataId);

    } catch(e) {
		console.log("Error while reading PSD: " + e);
	}
	return results;
}
