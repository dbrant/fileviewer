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

async function parseFormat(reader)
{
	var results = new ResultNode("PSD structure");
	try {
        var stream = new DataStream(reader);
        var node;

        if (await stream.readAsciiString(4) != "8BPS") {
            throw "This is not a valid PSD file.";
        }
        if (await stream.readUShortBe() != 1) {
            throw "Only version-1 PSD files are supported.";
        }

        stream.seek(6, 1);
        var numChannels = await stream.readUShortBe();
        var imgHeight = await stream.readUIntBe();
        var imgWidth = await stream.readUIntBe();
        var imgBpp = await stream.readUShortBe();
        var colorMode = await stream.readUShortBe();

        if ((imgWidth < 1) || (imgHeight < 1) || (imgWidth > 32767) || (imgHeight > 32767)) {
            throw "This PSD file appears to have invalid dimensions.";
        }

        results.add("Width", imgWidth);
        results.add("Height", imgHeight);
        results.add("Number of channels", numChannels);
        results.add("Bits per pixel", imgBpp);
        node = results.add("Color mode", colorMode);

        var colorModeLength = await stream.readUIntBe();
        node.add("Length", colorModeLength);

        var colorModePtr = stream.position;
        stream.seek(colorModeLength, 1);

        var imageResourceLength = await stream.readUIntBe();
        var imageResourcePtr = stream.position;

        node = results.add("Image resources");
        await psdParseImageResources(reader, node, imageResourcePtr, imageResourceLength);

        // explicitly go to the end of the image resource section, in case something went wrong
        // while parsing image resources.
        stream.seek(imageResourcePtr + imageResourceLength, 0);

        // layer and mask info
        var layerAndMaskLength = await stream.readUIntBe();
        stream.seek(layerAndMaskLength, 1);
        node = results.add("Layer and mask section");
        node.add("Length", layerAndMaskLength.toString(16));


        var compression = await stream.readUShortBe();
        results.add("Compression", compression);


        //var bmpDataId = reader.createImageData(imgWidth, imgHeight);
        //var bmpData = bmpDataId.data;

        try {

        } catch (e) {
            // give a partial image, in case of error or eof
        }

        //reader.onGetPreviewBitmap(bmpDataId);

    } catch (e) {
		console.log("Error while reading PSD: " + e);
	}
	return results;
}

async function psdParseImageResources(reader, results, imageResourceOffset, imageResourceLength) {
    var resolutionInfo = {};
    var displayInfo = {};
    var thumbnailInfo = {};
    var globalAngle;
    var colorCount;
    var transparentIndex;

    try {
        var stream = new DataStream(reader);
        stream.seek(imageResourceOffset, 0);

        while (!stream.eof() && (stream.position - imageResourceOffset) < imageResourceLength) {
            var imgResType = await stream.readAsciiString(4);
            if (psdIrbDesignators.indexOf(imgResType) == -1) {
                break;
            }

            var imgResId = await stream.readUShortBe();
            var sizeOfName = await stream.readByte();
            if (sizeOfName > 0) {
                if (sizeOfName % 2 != 0) {
                    stream.seek(1, 1);
                }

                var imgResName = await stream.readAsciiString(sizeOfName);
            }

            stream.skip(1, 1);

            var imgResSize = await stream.readUIntBe();
            if (imgResSize % 2 != 0) {
                imgResSize++;
            }

            var node = results.add("Image resource (" + imgResType + ")", imgResId);
            node.add("Size of name", sizeOfName);
            node.add("Total size", imgResSize);

            if (imgResId == 1005 && imgResSize == 16) {
                resolutionInfo.hRes = await stream.readUShortBe();
                resolutionInfo.hResUnit = await stream.readUIntBe();
                resolutionInfo.widthUnit = await stream.readUShortBe();
                resolutionInfo.vRes = await stream.readUShortBe();
                resolutionInfo.vResUnit = await stream.readUIntBe();
                resolutionInfo.heightUnit = await stream.readUShortBe();
            } else if (imgResId == 1007 && imgResSize == 14) {
                displayInfo.colorSpace = await stream.readUShortBe();
                displayInfo.color = [];
                displayInfo.color[0] = await stream.readUShortBe();
                displayInfo.color[1] = await stream.readUShortBe();
                displayInfo.color[2] = await stream.readUShortBe();
                displayInfo.color[3] = await stream.readUShortBe();
                displayInfo.opacity = await stream.readUShortBe();
                if (displayInfo.opacity > 100) {
                    displayInfo.opacity = 100;
                }
                var tempByte = await stream.readByte();
                displayInfo.kind = (tempByte != 0);
                stream.skip(1, 1);
            } else if (imgResId == 1033 || imgResId == 1036) {
                thumbnailInfo.position = stream.position;
                thumbnailInfo.format = await stream.readUIntBe();
                thumbnailInfo.width = await stream.readUIntBe();
                thumbnailInfo.height = await stream.readUIntBe();
                thumbnailInfo.widthBytes = await stream.readUIntBe();
                thumbnailInfo.size = await stream.readUIntBe();
                thumbnailInfo.compressedSize = await stream.readUIntBe();
                thumbnailInfo.bitsPerPixel = await stream.readUShortBe();
                thumbnailInfo.numPlanes = await stream.readUShortBe();

                var thumbOffset = stream.position;
                if (await stream.reader.byteAt(thumbOffset) == 0xFF && await stream.reader.byteAt(thumbOffset + 1) == 0xD8) {
                    // very likely a JPEG thumbnail
                    var thumbString = "data:image/png;base64," + base64FromArrayBuffer(await reader.getSliceAsArrayBuffer(thumbOffset, thumbnailInfo.size), 0, thumbnailInfo.size);
                    var thumbHtml = "<img class='previewImage' src='" + thumbString + "' />";
                    node.add("Thumbnail", thumbHtml);
                    reader.onGetPreviewImage(thumbString);
                    node.addResult(await parseJpgStructure(reader, thumbOffset));
                }

                // skip over the rest
                stream.skip(imgResSize - 28, 1);
            } else if (imgResId == 1037 && imgResSize == 4) {
                globalAngle = await stream.readUIntBe();
            } else if (imgResId == 1046 && imgResSize == 4) {
                colorCount = await stream.readUIntBe();
            } else if (imgResId == 1047 && imgResSize == 4) {
                transparentIndex = await stream.readUIntBe();
            } else {
                stream.seek(imgResSize, 1);
            }
        }
    } catch(e) {
        console.log("Error while reading PSD image resources: " + e);
    }
}

var psdIrbDesignators = [ "8BIM", "PHUT", "DCSR", "AgHg" ];