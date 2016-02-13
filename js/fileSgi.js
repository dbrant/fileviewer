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
	var results = new ResultNode("SGI structure");
	try {
		var stream = new DataStream(reader);

        var imgWidth;
        var imgHeight;
        var x, y, i, j, k, b;

        if (stream.readUShortBe() != 0x1DA) {
            throw "This is not a valid SGI file.";
        }

        var compressionType = stream.readByte();
        var bytesPerComponent = stream.readByte();
        var dimension = stream.readUShortBe();

        if (compressionType > 1) {
            throw  "Unsupported compression type.";
        }
        if (bytesPerComponent != 1) {
            throw "Unsupported bytes per component.";
        }
        if (dimension != 1 && dimension != 2 && dimension != 3) {
            throw "Unsupported dimension.";
        }

        imgWidth = stream.readUShortBe();
        imgHeight = stream.readUShortBe();
        var zSize = stream.readUShortBe();
        var pixMin = stream.readUIntBe();
        var pixMax = stream.readUIntBe();

        if ((imgWidth < 1) || (imgHeight < 1) || (imgWidth > 32767) || (imgHeight > 32767)) {
            throw "This SGI file appears to have invalid dimensions.";
        }

        stream.skip(4);

        var imgName = stream.readAsciiString(80).replace("\0", "").trim();
        var colorMapFormat = stream.readUIntBe();

        stream.skip(404);

        var offsets = [];
        if (compressionType == 1)
        {
            var offsetTableLen = imgHeight * zSize;
            for (i=0; i<offsetTableLen; i++) {
                offsets[i] = stream.readUIntBe();
            }
            if (offsets.length > 0) {
                stream.seek(offsets[0], 0);
            }
        }

        results.add("Width", imgWidth);
        results.add("Height", imgHeight);
        results.add("Image name", imgName);
        results.add("Compression type", compressionType);
        results.add("Bit planes", zSize);

        var bmpDataId = reader.createImageData(imgWidth, imgHeight);
        var bmpData = bmpDataId.data;

        try {

            if (compressionType == 1)
            {
                if (zSize == 1)
                {
                    x = 0;
                    for (y = imgHeight - 1; y >= 0; y--)
                    {
                        x = 0;
                        while (!stream.eof())
                        {
                            i = stream.readByte();
                            j = i & 0x7F;
                            if (j == 0) {
                                break;
                            }

                            if ((i & 0x80) != 0)
                            {
                                for (k = 0; k < j; k++)
                                {
                                    b = stream.readByte();
                                    bmpData[4 * (y * imgWidth + x)] = b;
                                    bmpData[4 * (y * imgWidth + x) + 1] = b;
                                    bmpData[4 * (y * imgWidth + x) + 2] = b;
                                    bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                                    x++;
                                }
                            }
                            else
                            {
                                b = stream.readByte();
                                for (k = 0; k < j; k++)
                                {
                                    bmpData[4 * (y * imgWidth + x)] = b;
                                    bmpData[4 * (y * imgWidth + x) + 1] = b;
                                    bmpData[4 * (y * imgWidth + x) + 2] = b;
                                    bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                                    x++;
                                }
                            }
                        }
                    }
                }
                else if (zSize == 3 || zSize == 4)
                {
                    var lineCount = 0;
                    var scanline = [];
                    for (i = 0; i < zSize; i++) {
                        scanline[i] = [];
                    }

                    var scanPtr, scanLineIndex;

                    for (y = imgHeight - 1; y >= 0; y--)
                    {
                        for (scanLineIndex = 0; scanLineIndex < 3; scanLineIndex++)
                        {
                            scanPtr = 0;
                            stream.seek(offsets[lineCount + scanLineIndex * imgHeight], 0);
                            while (!stream.eof())
                            {
                                i = stream.readByte();
                                j = i & 0x7F;
                                if (j == 0) {
                                    break;
                                }
                                if ((i & 0x80) != 0)
                                {
                                    for (k = 0; k < j; k++) {
                                        scanline[scanLineIndex][scanPtr++] = stream.readByte();
                                    }
                                }
                                else
                                {
                                    b = stream.readByte();
                                    for (k = 0; k < j; k++) {
                                        scanline[scanLineIndex][scanPtr++] = b;
                                    }
                                }
                            }
                        }

                        for (x = 0; x < imgWidth; x++)
                        {
                            bmpData[4 * (y * imgWidth + x)] = scanline[0][x];
                            bmpData[4 * (y * imgWidth + x) + 1] = scanline[1][x];
                            bmpData[4 * (y * imgWidth + x) + 2] = scanline[2][x];
                            bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                        }

                        lineCount++;
                    }
                }

            }
            else
            {
                if (zSize == 1)
                {
                    for (y = imgHeight - 1; y >= 0; y--)
                    {
                        for (x = 0; x < imgWidth; x++)
                        {
                            i = stream.readByte();
                            bmpData[4 * (y * imgWidth + x)] = i;
                            bmpData[4 * (y * imgWidth + x) + 1] = i;
                            bmpData[4 * (y * imgWidth + x) + 2] = i;
                            bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                        }
                    }
                }
                else if (zSize == 3)
                {
                    for (y = imgHeight - 1; y >= 0; y--)
                    {
                        for (x = 0; x < imgWidth; x++)
                        {
                            i = stream.readByte();
                            bmpData[4 * (y * imgWidth + x)] = i;
                        }
                    }
                    for (y = imgHeight - 1; y >= 0; y--)
                    {
                        for (x = 0; x < imgWidth; x++)
                        {
                            i = stream.readByte();
                            bmpData[4 * (y * imgWidth + x) + 1] = i;
                        }
                    }
                    for (y = imgHeight - 1; y >= 0; y--)
                    {
                        for (x = 0; x < imgWidth; x++)
                        {
                            i = stream.readByte();
                            bmpData[4 * (y * imgWidth + x) + 2] = i;
                            bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                        }
                    }
                }

            }

        } catch(e) {
            // give a partial image, in case of error or eof
        }

        reader.onGetPreviewBitmap(bmpDataId);

    } catch(e) {
		console.log("Error while reading SGI: " + e);
	}
	return results;
}
