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
	var results = new ResultNode("PCX structure");
	try {
		var stream = new DataStream(reader);

        var imgWidth;
        var imgHeight;
        var imgBpp;
        var tempByte;
        var x, y, i, j;
        var b, p, val;
        var scanline, realscanline;
        var colorPalette;

        tempByte = stream.readByte();
        if (tempByte != 10) {
            throw "This is not a valid PCX file.";
        }
        tempByte = stream.readByte();
        if (tempByte < 3 || tempByte > 5) {
            throw "Only Version 3, 4, and 5 PCX files are supported.";
        }
        tempByte = stream.readByte();
        if (tempByte != 1) {
            throw "Invalid PCX compression type.";
        }
        imgBpp = stream.readByte();
        if (imgBpp != 8 && imgBpp != 4 && imgBpp != 2 && imgBpp != 1) {
            throw "Only 8, 4, 2, and 1-bit PCX samples are supported.";
        }

        var xmin = stream.readUShortLe();
        var ymin = stream.readUShortLe();
        var xmax = stream.readUShortLe();
        var ymax = stream.readUShortLe();

        imgWidth = xmax - xmin + 1;
        imgHeight = ymax - ymin + 1;

        if ((imgWidth < 1) || (imgHeight < 1) || (imgWidth > 32767) || (imgHeight > 32767)) {
            throw "This PCX file appears to have invalid dimensions.";
        }

        stream.readUShortLe(); //hdpi
        stream.readUShortLe(); //vdpi

        colorPalette = stream.readBytes(48);
        stream.skip(1);

        var numPlanes = stream.readByte();
        var bytesPerLine = stream.readUShortLe();
        if (bytesPerLine == 0) {
            bytesPerLine = xmax - xmin + 1;
        }

        if (imgBpp == 8 && numPlanes == 1)
        {
            stream.seek(-768, 2);
            colorPalette = stream.readBytes(768);
        }

        //fix color palette if it's a 1-bit image, and there's no palette information
        if (imgBpp == 1)
        {
            if ((colorPalette[0] == colorPalette[3]) && (colorPalette[1] == colorPalette[4]) && (colorPalette[2] == colorPalette[5]))
            {
                colorPalette[0] = colorPalette[1] = colorPalette[2] = 0;
                colorPalette[3] = colorPalette[4] = colorPalette[5] = 0xFF;
            }
        }

        stream.seek(128, 0);

        x = 0;
        y = 0;
        var rleReader = new pcxRleReader(stream);

        results.add("Width", imgWidth);
        results.add("Height", imgHeight);
        results.add("Bits per pixel", imgBpp);
        results.add("Bit planes", numPlanes);

        var bmpDataId = reader.createImageData(imgWidth, imgHeight);
        var bmpData = bmpDataId.data;

        try {
            if (imgBpp == 1) {
                scanline = [];
                for (y = 0; y < imgHeight; y++) {
                    //add together all the planes...
                    realscanline = Array.apply(null, new Array(bytesPerLine * 8)).map(Number.prototype.valueOf, 0);
                    for (p = 0; p < numPlanes; p++) {
                        x = 0;
                        for (i = 0; i < bytesPerLine; i++) {
                            scanline[i] = rleReader.readByte();
                            for (b = 7; b >= 0; b--) {
                                if ((scanline[i] & (1 << b)) != 0) val = 1; else val = 0;
                                realscanline[x] |= (val << p);
                                x++;
                            }
                        }
                    }
                    for (x = 0; x < imgWidth; x++) {
                        i = realscanline[x];
                        bmpData[4 * (y * imgWidth + x)] = colorPalette[i * 3];
                        bmpData[4 * (y * imgWidth + x) + 1] = colorPalette[i * 3 + 1];
                        bmpData[4 * (y * imgWidth + x) + 2] = colorPalette[i * 3 + 2];
                        bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                    }
                }
            }
            else {
                if (numPlanes == 1) {
                    if (imgBpp == 8) {
                        scanline = [];
                        for (y = 0; y < imgHeight; y++) {
                            for (i = 0; i < bytesPerLine; i++) {
                                scanline[i] = rleReader.readByte();
                            }
                            for (x = 0; x < imgWidth; x++) {
                                i = scanline[x];
                                bmpData[4 * (y * imgWidth + x)] = colorPalette[i * 3];
                                bmpData[4 * (y * imgWidth + x) + 1] = colorPalette[i * 3 + 1];
                                bmpData[4 * (y * imgWidth + x) + 2] = colorPalette[i * 3 + 2];
                                bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                            }
                        }
                    }
                    else if (imgBpp == 4) {
                        scanline = [];
                        for (y = 0; y < imgHeight; y++) {
                            for (i = 0; i < bytesPerLine; i++) {
                                scanline[i] = rleReader.readByte();
                            }
                            for (x = 0; x < imgWidth; x++) {
                                i = scanline[x / 2];
                                bmpData[4 * (y * imgWidth + x)] = colorPalette[((i >> 4) & 0xF) * 3];
                                bmpData[4 * (y * imgWidth + x) + 1] = colorPalette[((i >> 4) & 0xF) * 3 + 1];
                                bmpData[4 * (y * imgWidth + x) + 2] = colorPalette[((i >> 4) & 0xF) * 3 + 2];
                                bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                                x++;
                                bmpData[4 * (y * imgWidth + x)] = colorPalette[(i & 0xF) * 3];
                                bmpData[4 * (y * imgWidth + x) + 1] = colorPalette[(i & 0xF) * 3 + 1];
                                bmpData[4 * (y * imgWidth + x) + 2] = colorPalette[(i & 0xF) * 3 + 2];
                                bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                            }
                        }
                    }
                    else if (imgBpp == 2) {
                        scanline = [];
                        for (y = 0; y < imgHeight; y++) {
                            for (i = 0; i < bytesPerLine; i++) {
                                scanline[i] = rleReader.readByte();
                            }
                            for (x = 0; x < imgWidth; x++) {
                                i = scanline[x / 4];
                                bmpData[4 * (y * imgWidth + x)] = colorPalette[((i >> 6) & 0x3) * 3];
                                bmpData[4 * (y * imgWidth + x) + 1] = colorPalette[((i >> 6) & 0x3) * 3 + 1];
                                bmpData[4 * (y * imgWidth + x) + 2] = colorPalette[((i >> 6) & 0x3) * 3 + 2];
                                bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                                x++;
                                bmpData[4 * (y * imgWidth + x)] = colorPalette[((i >> 4) & 0x3) * 3];
                                bmpData[4 * (y * imgWidth + x) + 1] = colorPalette[((i >> 4) & 0x3) * 3 + 1];
                                bmpData[4 * (y * imgWidth + x) + 2] = colorPalette[((i >> 4) & 0x3) * 3 + 2];
                                bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                                x++;
                                bmpData[4 * (y * imgWidth + x)] = colorPalette[((i >> 2) & 0x3) * 3];
                                bmpData[4 * (y * imgWidth + x) + 1] = colorPalette[((i >> 2) & 0x3) * 3 + 1];
                                bmpData[4 * (y * imgWidth + x) + 2] = colorPalette[((i >> 2) & 0x3) * 3 + 2];
                                bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                                x++;
                                bmpData[4 * (y * imgWidth + x)] = colorPalette[(i & 0x3) * 3];
                                bmpData[4 * (y * imgWidth + x) + 1] = colorPalette[(i & 0x3) * 3 + 1];
                                bmpData[4 * (y * imgWidth + x) + 2] = colorPalette[(i & 0x3) * 3 + 2];
                                bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                            }
                        }
                    }
                }
                else if (numPlanes == 3) {
                    var scanlineR = [];
                    var scanlineG = [];
                    var scanlineB = [];
                    var bytePtr = 0;

                    for (y = 0; y < imgHeight; y++) {
                        for (i = 0; i < bytesPerLine; i++) {
                            scanlineR[i] = rleReader.readByte();
                        }
                        for (i = 0; i < bytesPerLine; i++) {
                            scanlineG[i] = rleReader.readByte();
                        }
                        for (i = 0; i < bytesPerLine; i++) {
                            scanlineB[i] = rleReader.readByte();
                        }

                        for (var n = 0; n < imgWidth; n++) {
                            bmpData[bytePtr++] = scanlineR[n];
                            bmpData[bytePtr++] = scanlineG[n];
                            bmpData[bytePtr++] = scanlineB[n];
                            bmpData[bytePtr++] = 0xFF;
                        }
                    }
                }

            }//bpp

        } catch(e) {
            // give a partial image, in case of error or eof
        }

        reader.onGetPreviewBitmap(bmpDataId);

    } catch(e) {
		console.log("Error while reading PCX: " + e);
	}
	return results;
}

var pcxRleReader = function(stream) {
    this.stream = stream;
    this.currentByte = 0;
    this.runLength = 0;
    this.runIndex = 0;

    this.readByte = function () {
        if (this.runLength > 0) {
            this.runIndex++;
            if (this.runIndex == (this.runLength - 1))
                this.runLength = 0;
        }
        else {
            this.currentByte = this.stream.readByte();
            if (this.currentByte > 191) {
                this.runLength = this.currentByte - 192;
                this.currentByte = this.stream.readByte();
                if (this.runLength == 1) {
                    this.runLength = 0;
                }
                this.runIndex = 0;
            }
        }
        return this.currentByte;
    }
};
