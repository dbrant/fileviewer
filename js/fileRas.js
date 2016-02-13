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
	var results = new ResultNode("RAS structure");
	try {
		var stream = new DataStream(reader);

        if (stream.readUIntBe() != 0x59A66A95) {
            throw "This is not a valid RAS file.";
        }

        var i, dx, dy, b, val, bytePtr, tempByte, scanline;
        var imgWidth = stream.readUIntBe();
        var imgHeight = stream.readUIntBe();
        var imgBpp = stream.readUIntBe();
        var dataLength = stream.readUIntBe();
        var rasType = stream.readUIntBe();
        var mapType = stream.readUIntBe();
        var mapLength = stream.readUIntBe();

        if ((imgWidth < 1) || (imgHeight < 1) || (imgWidth > 32767) || (imgHeight > 32767) || (mapLength > 32767)) {
            throw "This RAS file appears to have invalid dimensions.";
        }

        if ((imgBpp != 32) && (imgBpp != 24) && (imgBpp != 8) && (imgBpp != 4) && (imgBpp != 1)) {
            throw "Only 1, 4, 8, 24, and 32 bit images are supported.";
        }

        var rleReader = new rasRleReader(stream, rasType == 2);

        var colorPalette = [];
        if (mapType > 0)
        {
            colorPalette = stream.readBytes(mapLength)
        }

        results.add("Width", imgWidth);
        results.add("Height", imgHeight);
        results.add("Bits per pixel", imgBpp);

        var bmpDataId = reader.createImageData(imgWidth, imgHeight);
        var bmpData = bmpDataId.data;

        try {
            if (imgBpp == 1)
            {
                dx = 0;
                dy = 0;
                bytePtr = 0;
                while (dy < imgHeight)
                {
                    b = rleReader.readByte();
                    if (b == -1) { break; }
                    for (i = 7; i >= 0; i--)
                    {
                        if ((b & (1 << i)) != 0) val = 0; else val = 255;
                        bmpData[bytePtr++] = val;
                        bmpData[bytePtr++] = val;
                        bmpData[bytePtr++] = val;
                        bmpData[bytePtr++] = 0xFF;
                        dx++;
                        if (dx == imgWidth)
                        {
                            dx = 0; dy++;
                            break;
                        }
                    }
                }
            }
            else if (imgBpp == 4)
            {
                bytePtr = 0;
                scanline = [];
                for (dy = 0; dy < imgHeight; dy++)
                {
                    for (i = 0; i < imgWidth; i++)
                    {
                        tempByte = rleReader.readByte();
                        scanline[i++] = ((tempByte >> 4) & 0xF);
                        scanline[i] = (tempByte & 0xF);
                    }
                    if (imgWidth % 2 == 1) {
                        rleReader.readByte();
                    }
                    if ((mapType > 0) && (mapLength == 48))
                    {
                        for (dx = 0; dx < imgWidth; dx++)
                        {
                            bmpData[bytePtr++] = colorPalette[scanline[dx]];
                            bmpData[bytePtr++] = colorPalette[scanline[dx] + 16];
                            bmpData[bytePtr++] = colorPalette[scanline[dx] + 32];
                            bmpData[bytePtr++] = 0xFF;
                        }
                    }
                    else
                    {
                        for (dx = 0; dx < imgWidth; dx++)
                        {
                            bmpData[bytePtr++] = scanline[dx];
                            bmpData[bytePtr++] = scanline[dx];
                            bmpData[bytePtr++] = scanline[dx];
                            bmpData[bytePtr++] = 0xFF;
                        }
                    }
                }
            }
            else if (imgBpp == 8)
            {
                bytePtr = 0;
                scanline = [];
                for (dy = 0; dy < imgHeight; dy++)
                {
                    for (i = 0; i < imgWidth; i++) {
                        scanline[i] = rleReader.readByte();
                    }
                    if (imgWidth % 2 == 1) {
                        rleReader.readByte();
                    }
                    if ((mapType > 0) && (mapLength == 768))
                    {
                        for (dx = 0; dx < imgWidth; dx++)
                        {
                            bmpData[bytePtr++] = colorPalette[scanline[dx]];
                            bmpData[bytePtr++] = colorPalette[scanline[dx] + 256];
                            bmpData[bytePtr++] = colorPalette[scanline[dx] + 512];
                            bmpData[bytePtr++] = 0xFF;
                        }
                    }
                    else
                    {
                        for (dx = 0; dx < imgWidth; dx++)
                        {
                            bmpData[bytePtr++] = scanline[dx];
                            bmpData[bytePtr++] = scanline[dx];
                            bmpData[bytePtr++] = scanline[dx];
                            bmpData[bytePtr++] = 0xFF;
                        }
                    }
                }
            }
            else if (imgBpp == 24)
            {
                bytePtr = 0;
                scanline = [];
                for (dy = 0; dy < imgHeight; dy++)
                {
                    for (i = 0; i < imgWidth * 3; i++) {
                        scanline[i] = rleReader.readByte();
                    }
                    if ((imgWidth * 3) % 2 == 1) {
                        stream.readByte();
                    }
                    for (dx = 0; dx < imgWidth; dx++)
                    {
                        bmpData[bytePtr++] = scanline[dx * 3 + 2];
                        bmpData[bytePtr++] = scanline[dx * 3 + 1];
                        bmpData[bytePtr++] = scanline[dx * 3];
                        bmpData[bytePtr++] = 0xFF;
                    }
                }
            }
            else if (imgBpp == 32)
            {
                bytePtr = 0;
                scanline = [];
                for (dy = 0; dy < imgHeight; dy++)
                {
                    for (i = 0; i < imgWidth * 4; i++) {
                        scanline[i] = rleReader.readByte();
                    }
                    for (dx = 0; dx < imgWidth; dx++)
                    {
                        bmpData[bytePtr++] = scanline[dx * 4 + 2];
                        bmpData[bytePtr++] = scanline[dx * 4 + 1];
                        bmpData[bytePtr++] = scanline[dx * 4];
                        bmpData[bytePtr++] = 0xFF; //scanline[dx * 4 + 3];
                    }
                }
            }
        } catch(e) {
            // give a partial image, in case of error or eof
        }

        reader.onGetPreviewBitmap(bmpDataId);

    } catch(e) {
		console.log("Error while reading RAS: " + e);
	}
	return results;
}

var rasRleReader = function(stream, isRle) {
    this.stream = stream;
    this.currentByte = 0;
    this.runLength = 0;
    this.runIndex = 0;
    this.isRle = isRle;

    this.readByte = function () {
        if (!this.isRle) {
            return this.stream.readByte();
        }
        if (this.runLength > 0) {
            this.runIndex++;
            if (this.runIndex == (this.runLength - 1)) {
                this.runLength = 0;
            }
        }
        else {
            this.currentByte = stream.readByte();
            if (this.currentByte == 0x80) {
                this.currentByte = stream.readByte();
                if (this.currentByte == 0) {
                    this.currentByte = 0x80;
                }
                else {
                    this.runLength = this.currentByte + 1;
                    this.runIndex = 0;
                    this.currentByte = stream.readByte();
                }
            }
        }
        return this.currentByte;
    }
};
