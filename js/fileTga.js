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
	var results = new ResultNode("TGA structure");
	try {
		var stream = new DataStream(reader);

        var i, j, x, y, hi, lo;
        var palette = [];
        var scanline = [];
        var idFieldLength = await stream.readByte();
        var colorMap = await stream.readByte();
        var imageType = await stream.readByte();
        var colorMapOffset = await stream.readUShortLe();
        var colorsUsed = await stream.readUShortLe();
        var bitsPerColorMap = await stream.readByte();
        var xCoord = await stream.readUShortLe();
        var yCoord = await stream.readUShortLe();
        var imgWidth = await stream.readUShortLe();
        var imgHeight = await stream.readUShortLe();
        var bitsPerPixel = await stream.readByte();
        var imgFlags = await stream.readByte();
        var imgOrientation = (imgFlags >> 4) & 0x3;

        if (colorMap > 1) {
            throw "This is not a valid TGA file.";
        }
        if (idFieldLength > 0) {
            var tgaIdStr = await stream.readAsciiString(idFieldLength);
            results.add("Targa image ID", tgaIdStr);
        }

        results.add("Width", imgWidth);
        results.add("Height", imgHeight);
        results.add("Bits per pixel", bitsPerPixel);
        results.add("Image type", imageType);
        results.add("Image orientation", imgOrientation);

        //image types:
        //0 - No Image Data Available
        //1 - Uncompressed Color Image
        //2 - Uncompressed RGB Image
        //3 - Uncompressed Black & White Image
        //9 - Compressed Color Image
        //10 - Compressed RGB Image
        //11 - Compressed Black & White Image

        if ((imageType > 11) || ((imageType > 3) && (imageType < 9)))
        {
            throw "This image type (" + imageType + ") is not supported.";
        }
        else if (bitsPerPixel != 8 && bitsPerPixel != 15 && bitsPerPixel != 16 && bitsPerPixel != 24 && bitsPerPixel != 32)
        {
            throw "Number of bits per pixel (" + bitsPerPixel + ") is not supported.";
        }
        if (colorMap > 0)
        {
            if (bitsPerColorMap != 15 && bitsPerColorMap != 16 && bitsPerColorMap != 24 && bitsPerColorMap != 32)
            {
                throw "Number of bits per color map (" + bitsPerPixel + ") is not supported.";
            }
        }

        var bmpDataId = reader.createImageData(imgWidth, imgHeight);
        var bmpData = bmpDataId.data;

        try {
            if (colorMap > 0)
            {
                results.add("Color map", bitsPerColorMap.toString() + "-bit");
                var paletteEntries = colorMapOffset + colorsUsed;
                if (bitsPerColorMap == 24)
                {
                    for (i = colorMapOffset; i < paletteEntries; i++)
                    {
                        palette[i] = 0xFF000000;
                        palette[i] |= (await stream.readByte() << 16);
                        palette[i] |= (await stream.readByte() << 8);
                        palette[i] |= (await stream.readByte());
                    }
                }
                else if (bitsPerColorMap == 32)
                {
                    for (i = colorMapOffset; i < paletteEntries; i++)
                    {
                        palette[i] = 0xFF000000;
                        palette[i] |= (await stream.readByte() << 16);
                        palette[i] |= (await stream.readByte() << 8);
                        palette[i] |= (await stream.readByte());
                        palette[i] |= (await stream.readByte() << 24);
                    }
                }
                else if ((bitsPerColorMap == 15) || (bitsPerColorMap == 16))
                {
                    for (i = colorMapOffset; i < paletteEntries; i++)
                    {
                        hi = await stream.readByte();
                        lo = await stream.readByte();
                        palette[i] = 0xFF000000;
                        palette[i] |= ((hi & 0x1F) << 3) << 16;
                        palette[i] |= ((((lo & 0x3) << 3) + ((hi & 0xE0) >> 5)) << 3) << 8;
                        palette[i] |= (((lo & 0x7F) >> 2) << 3);
                    }
                }
            }

            if (imageType == 1 || imageType == 2 || imageType == 3)
            {
                for (y = imgHeight - 1; y >= 0; y--)
                {
                    switch (bitsPerPixel) {
                        case 8:
                            scanline = await stream.readBytes(imgWidth * (bitsPerPixel / 8));
                            if (imageType == 1) {
                                for (x = 0; x < imgWidth; x++) {
                                    bmpData[4 * (y * imgWidth + x)] = ((palette[scanline[x]]) & 0xFF);
                                    bmpData[4 * (y * imgWidth + x) + 1] = ((palette[scanline[x]] >> 8) & 0xFF);
                                    bmpData[4 * (y * imgWidth + x) + 2] = ((palette[scanline[x]] >> 16) & 0xFF);
                                    bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                                }
                            }
                            else if (imageType == 3) {
                                for (x = 0; x < imgWidth; x++) {
                                    bmpData[4 * (y * imgWidth + x)] = scanline[x];
                                    bmpData[4 * (y * imgWidth + x) + 1] = scanline[x];
                                    bmpData[4 * (y * imgWidth + x) + 2] = scanline[x];
                                    bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                                }
                            }
                            break;
                        case 15:
                        case 16:
                            for (x = 0; x < imgWidth; x++) {
                                hi = await stream.readByte();
                                lo = await stream.readByte();
                                bmpData[4 * (y * imgWidth + x)] = (((lo & 0x7F) >> 2) << 3);
                                bmpData[4 * (y * imgWidth + x) + 1] = ((((lo & 0x3) << 3) + ((hi & 0xE0) >> 5)) << 3);
                                bmpData[4 * (y * imgWidth + x) + 2] = ((hi & 0x1F) << 3);
                                bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                            }
                            break;
                        case 24:
                            scanline = await stream.readBytes(imgWidth * (bitsPerPixel / 8));
                            for (x = 0; x < imgWidth; x++) {
                                bmpData[4 * (y * imgWidth + x)] = scanline[x * 3 + 2];
                                bmpData[4 * (y * imgWidth + x) + 1] = scanline[x * 3 + 1];
                                bmpData[4 * (y * imgWidth + x) + 2] = scanline[x * 3];
                                bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                            }
                            break;
                        case 32:
                            scanline = await stream.readBytes(imgWidth * (bitsPerPixel / 8));
                            for (x = 0; x < imgWidth; x++) {
                                bmpData[4 * (y * imgWidth + x)] = scanline[x * 4 + 2];
                                bmpData[4 * (y * imgWidth + x) + 1] = scanline[x * 4 + 1];
                                bmpData[4 * (y * imgWidth + x) + 2] = scanline[x * 4];
                                bmpData[4 * (y * imgWidth + x) + 3] = 0xFF; //scanline[x * 4 + 3];
                            }
                            break;
                    }
                }

            }
            else if (imageType == 9 || imageType == 10 || imageType == 11)
            {
                y = imgHeight - 1;
                x = 0;
                var bytesPerPixel = bitsPerPixel / 8;

                while (y >= 0 && !stream.eof())
                {
                    i = await stream.readByte();
                    if (i < 128)
                    {
                        i++;
                        switch (bitsPerPixel) {
                            case 8:
                                scanline = await stream.readBytes(i * bytesPerPixel);
                                if (imageType == 9) {
                                    for (j = 0; j < i; j++) {
                                        bmpData[4 * (y * imgWidth + x)] = ((palette[scanline[j]]) & 0xFF);
                                        bmpData[4 * (y * imgWidth + x) + 1] = ((palette[scanline[j]] >> 8) & 0xFF);
                                        bmpData[4 * (y * imgWidth + x) + 2] = ((palette[scanline[j]] >> 16) & 0xFF);
                                        bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                                        x++;
                                        if (x >= imgWidth) {
                                            x = 0;
                                            y--;
                                        }
                                    }
                                }
                                else if (imageType == 11) {
                                    for (j = 0; j < i; j++) {
                                        bmpData[4 * (y * imgWidth + x)] = scanline[j];
                                        bmpData[4 * (y * imgWidth + x) + 1] = scanline[j];
                                        bmpData[4 * (y * imgWidth + x) + 2] = scanline[j];
                                        bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                                        x++;
                                        if (x >= imgWidth) {
                                            x = 0;
                                            y--;
                                        }
                                    }
                                }
                                break;
                            case 15:
                            case 16:
                                for (j = 0; j < i; j++) {
                                    hi = await stream.readByte();
                                    lo = await stream.readByte();
                                    bmpData[4 * (y * imgWidth + x)] = (((lo & 0x7F) >> 2) << 3);
                                    bmpData[4 * (y * imgWidth + x) + 1] = ((((lo & 0x3) << 3) + ((hi & 0xE0) >> 5)) << 3);
                                    bmpData[4 * (y * imgWidth + x) + 2] = ((hi & 0x1F) << 3);
                                    bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                                    x++;
                                    if (x >= imgWidth) {
                                        x = 0;
                                        y--;
                                    }
                                }
                                break;
                            case 24:
                                scanline = await stream.readBytes(i * bytesPerPixel);
                                for (j = 0; j < i; j++) {
                                    bmpData[4 * (y * imgWidth + x)] = scanline[j * 3 + 2];
                                    bmpData[4 * (y * imgWidth + x) + 1] = scanline[j * 3 + 1];
                                    bmpData[4 * (y * imgWidth + x) + 2] = scanline[j * 3];
                                    bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                                    x++;
                                    if (x >= imgWidth) {
                                        x = 0;
                                        y--;
                                    }
                                }
                                break;
                            case 32:
                                scanline = await stream.readBytes(i * bytesPerPixel);
                                for (j = 0; j < i; j++) {
                                    bmpData[4 * (y * imgWidth + x)] = scanline[j * 4 + 2];
                                    bmpData[4 * (y * imgWidth + x) + 1] = scanline[j * 4 + 1];
                                    bmpData[4 * (y * imgWidth + x) + 2] = scanline[j * 4];
                                    bmpData[4 * (y * imgWidth + x) + 3] = 0xFF; //scanline[j * 4 + 3];
                                    x++;
                                    if (x >= imgWidth) {
                                        x = 0;
                                        y--;
                                    }
                                }
                                break;
                        }
                    }
                    else {
                        i &= 0x7F;
                        i++;
                        var r, g, b, a, p;

                        switch (bitsPerPixel) {
                            case 8:
                                p = await stream.readByte();
                                if (imageType == 9) {
                                    for (j = 0; j < i; j++) {
                                        bmpData[4 * (y * imgWidth + x)] = ((palette[p]) & 0xFF);
                                        bmpData[4 * (y * imgWidth + x) + 1] = ((palette[p] >> 8) & 0xFF);
                                        bmpData[4 * (y * imgWidth + x) + 2] = ((palette[p] >> 16) & 0xFF);
                                        bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                                        x++;
                                        if (x >= imgWidth) {
                                            x = 0;
                                            y--;
                                        }
                                    }
                                }
                                else if (imageType == 11) {
                                    for (j = 0; j < i; j++) {
                                        bmpData[4 * (y * imgWidth + x)] = p;
                                        bmpData[4 * (y * imgWidth + x) + 1] = p;
                                        bmpData[4 * (y * imgWidth + x) + 2] = p;
                                        bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                                        x++;
                                        if (x >= imgWidth) {
                                            x = 0;
                                            y--;
                                        }
                                    }
                                }
                                break;
                            case 15:
                            case 16:
                                hi = await stream.readByte();
                                lo = await stream.readByte();
                                for (j = 0; j < i; j++) {
                                    bmpData[4 * (y * imgWidth + x)] = (((lo & 0x7F) >> 2) << 3);
                                    bmpData[4 * (y * imgWidth + x) + 1] = ((((lo & 0x3) << 3) + ((hi & 0xE0) >> 5)) << 3);
                                    bmpData[4 * (y * imgWidth + x) + 2] = ((hi & 0x1F) << 3);
                                    bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                                    x++;
                                    if (x >= imgWidth) {
                                        x = 0;
                                        y--;
                                    }
                                }
                                break;
                            case 24:
                                r = await stream.readByte();
                                g = await stream.readByte();
                                b = await stream.readByte();
                                for (j = 0; j < i; j++) {
                                    bmpData[4 * (y * imgWidth + x)] = b;
                                    bmpData[4 * (y * imgWidth + x) + 1] = g;
                                    bmpData[4 * (y * imgWidth + x) + 2] = r;
                                    bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                                    x++;
                                    if (x >= imgWidth) {
                                        x = 0;
                                        y--;
                                    }
                                }
                                break;
                            case 32:
                                r = await stream.readByte();
                                g = await stream.readByte();
                                b = await stream.readByte();
                                a = await stream.readByte();
                                for (j = 0; j < i; j++) {
                                    bmpData[4 * (y * imgWidth + x)] = b;
                                    bmpData[4 * (y * imgWidth + x) + 1] = g;
                                    bmpData[4 * (y * imgWidth + x) + 2] = r;
                                    bmpData[4 * (y * imgWidth + x) + 3] = 0xFF; //a;
                                    x++;
                                    if (x >= imgWidth) {
                                        x = 0;
                                        y--;
                                    }
                                }
                                break;
                        }
                    }
                }
            }

        } catch(e) {
            // give a partial image, in case of error or eof
        }

        reader.onGetPreviewBitmap(bmpDataId);

    } catch(e) {
		console.log("Error while reading TGA: " + e);
	}
	return results;
}
