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
	var results = new ResultNode("DICOM structure");
	try {
        var stream = new DataStream(reader);
        stream.skip(0x80);

        if (stream.readAsciiString(4) != "DICM") {
            throw "Not a valid DICOM file.";
        }
        stream.skip(8);

        var imgWidth = 0, imgHeight = 0;
        var samplesPerPixel = 0, numFrames = 0, bitsPerSample = 0, bitsStored = 0;
        var dataLength = 0;
        var bigEndian = false, explicitVR = true;
        var isJPEG = false, isRLE = false;
        var i, j, x, y, b;

        //read the meta-group, and determine stuff from it
        var metaGroupLen = stream.readUIntLe();
        console.log("group len: " + metaGroupLen);
        if (metaGroupLen > 10000) {
            throw "Meta group is a bit too long. May not be a valid DICOM file.";
        }

        var metaGroupStr = stream.readAsciiString(metaGroupLen);
        if (metaGroupStr.indexOf("1.2.840.10008.1.2\0") >= 0) {
            explicitVR = false;
        }
        if (metaGroupStr.indexOf("1.2.840.10008.1.2.2\0") >= 0) {
            bigEndian = true;
        }
        if (metaGroupStr.indexOf("1.2.840.10008.1.2.5\0") >= 0) {
            isRLE = true;
        }
        if (metaGroupStr.indexOf("1.2.840.10008.1.2.4.") >= 0) {
            isJPEG = true;
        }

        if (isRLE) {
            throw "RLE-encoded DICOM images not yet supported.";
        }
        if (isJPEG) {
            throw "JPEG-encoded DICOM images not yet supported.";
        }

        //get header information:
        var reachedData = false;
        var groupNumber, elementNumber;
        var v1, v2;

        while (!reachedData && !stream.eof())
        {
            groupNumber = dicomGetGroupNumber(stream, bigEndian);
            elementNumber = dicomGetShort(stream, groupNumber, bigEndian);

            if (groupNumber == 0x28)
            {
                if (elementNumber == 0x2)
                {
                    samplesPerPixel = dicomGetNumeric(stream, groupNumber, bigEndian, explicitVR);
                }
                else if (elementNumber == 0x8)
                {
                    numFrames = dicomGetNumeric(stream, groupNumber, bigEndian, explicitVR);
                }
                else if (elementNumber == 0x10)
                {
                    imgHeight = dicomGetNumeric(stream, groupNumber, bigEndian, explicitVR);
                }
                else if (elementNumber == 0x11)
                {
                    imgWidth = dicomGetNumeric(stream, groupNumber, bigEndian, explicitVR);
                }
                else if (elementNumber == 0x100)
                {
                    bitsPerSample = dicomGetNumeric(stream, groupNumber, bigEndian, explicitVR);
                }
                else if (elementNumber == 0x101)
                {
                    bitsStored = dicomGetNumeric(stream, groupNumber, bigEndian, explicitVR);
                }
                else
                {
                    dicomSkipElement(stream, groupNumber, elementNumber, bigEndian, explicitVR, results);
                }
            }
            else if (groupNumber == 0x7FE0)
            {
                if (elementNumber == 0x10)
                {
                    //we've reached the data!
                    if (explicitVR)
                    {
                        v1 = stream.readAsciiString(1);
                        v2 = stream.readAsciiString(1);
                        dicomGetShort(stream, groupNumber, false);
                        dataLength = dicomGetInt(stream, groupNumber, bigEndian);
                    }
                    else
                    {
                        dataLength = dicomGetInt(stream, groupNumber, bigEndian);
                    }
                    reachedData = true;
                }
                else
                {
                    dicomSkipElement(stream, groupNumber, elementNumber, bigEndian, explicitVR);
                }
            }
            else
            {
                dicomSkipElement(stream, groupNumber, elementNumber, bigEndian, explicitVR, results);
            }
        }

        results.add("Width", imgWidth);
        results.add("Height", imgHeight);

        if (dataLength == -1)
        {
            throw "Sequentially packeted data not yet supported.";
            /*
            //we'll have to read the data by sequential packets
            var dataSegments = [];
            var tempShort;
            var segmentLen = 0;

            while (!stream.eof())
            {
                tempShort = dicomGetShort(stream, 0, bigEndian);
                if (tempShort != 0xFFFE)
                    break;

                tempShort = dicomGetShort(stream, 0, bigEndian);
                if ((tempShort != 0xE000) && (tempShort != 0xE00D) && (tempShort != 0xE0DD))
                    break;

                segmentLen = dicomGetInt(stream, 0, bigEndian);

                if (segmentLen < 0 || segmentLen > 100000000)
                    break;

                if (segmentLen > 0)
                {
                    var segment = stream.readBytes(segmentLen);
                    dataSegments.push(segment);
                }
            }

            dataLength = 0;
            for (i = 0; i < dataSegments.length; i++) {
                dataLength += dataSegments[i].length;
            }
            data = [];
            for (i = 0; i < dataSegments.length; i++)
            {
                data = data.concat(dataSegments[i]);
            }
            */
        }

        if (dataLength == 0)
            throw "DICOM file does not appear to have any image data.";

        //detect whether the data is really a JPG image

        if ((reader.byteAt(stream.position) == 0xFF) && (reader.byteAt(stream.position + 1) == 0xD8) && (reader.byteAt(stream.position + 2) == 0xFF))
        {
            console.log(">> it's a JPG file!");
            return results;
        }

        if (numFrames == 0)
            numFrames = 1;

        if (samplesPerPixel > 4)
            throw "Do not support greater than 4 samples per pixel.";

        if ((bitsPerSample != 8) && (bitsPerSample != 16) && (bitsPerSample != 32))
            throw "Invalid bits per sample.";

        var bmpDataId = reader.createImageData(imgWidth, imgHeight);
        var bmpData = bmpDataId.data;

        try {

            if (samplesPerPixel == 1)
            {
                if (bitsPerSample == 8)
                {
                    for (y = 0; y < imgHeight; y++)
                    {
                        for (x = 0; x < imgWidth; x++)
                        {
                            b = stream.readByte();
                            bmpData[4 * (y * imgWidth + x)] = b;
                            bmpData[4 * (y * imgWidth + x) + 1] = b;
                            bmpData[4 * (y * imgWidth + x) + 2] = b;
                            bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                        }
                    }
                }
                else if (bitsPerSample == 16)
                {
                    //pre-read all the samples, so we can normalize
                    var samples = [];
                    try
                    {
                        for (i = 0; i < imgHeight * imgWidth; i++) {
                            samples.push(dicomGetShort(stream, 0, bigEndian));
                        }
                    }
                    catch(e) { }

                    //normalize
                    var maxVal = 0;
                    for (i = 0; i < samples.length; i++) {
                        if (samples[i] > maxVal)
                            maxVal = samples[i];
                    }
                    var multiplier = maxVal == 0 ? 1 : 65536 / maxVal;
                    var sampPtr = 0;
                    for (y = 0; y < imgHeight; y++)
                    {
                        for (x = 0; x < imgWidth; x++)
                        {
                            b = ((samples[sampPtr++] * multiplier) >> 8);
                            //b = (byte)(getShort(reader, 0, bigEndian) & 0xFF);
                            bmpData[4 * (y * imgWidth + x)] = b;
                            bmpData[4 * (y * imgWidth + x) + 1] = b;
                            bmpData[4 * (y * imgWidth + x) + 2] = b;
                            bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                        }
                    }
                }
                else if (bitsPerSample == 32)
                {
                    for (y = 0; y < imgHeight; y++)
                    {
                        for (x = 0; x < imgWidth; x++)
                        {
                            b = (dicomGetFloat(stream, 0, bigEndian) * 255);
                            bmpData[4 * (y * imgWidth + x)] = b;
                            bmpData[4 * (y * imgWidth + x) + 1] = b;
                            bmpData[4 * (y * imgWidth + x) + 2] = b;
                            bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                        }
                    }
                }
            }
            else if (samplesPerPixel == 3)
            {
                if (bitsPerSample == 8)
                {
                    for (y = 0; y < imgHeight; y++)
                    {
                        for (x = 0; x < imgWidth; x++)
                        {
                            bmpData[4 * (y * imgWidth + x) + 2] = stream.readByte();
                            bmpData[4 * (y * imgWidth + x) + 1] = stream.readByte();
                            bmpData[4 * (y * imgWidth + x)] = stream.readByte();
                            bmpData[4 * (y * imgWidth + x) + 3] = 0xFF;
                        }
                    }
                }
                else if (bitsPerSample == 16)
                {
                    throw "16bpp not yet supported.";
                }
                else if (bitsPerSample == 32)
                {
                    throw "32bpp not yet supported.";
                }
            }

        } catch(e) {
            // give a partial image, in case of error or eof
        }

        reader.onGetPreviewBitmap(bmpDataId);

    } catch(e) {
		console.log("Error while reading DICOM: " + e);
	}
	return results;
}


function dicomGetGroupNumber(stream, bigEndian)
{
    var ret = 0;
    ret = stream.readUShortLe();
    if (ret != 0x2) {
        if (bigEndian) {
            stream.seek(-2, 1);
            ret = stream.readUShortBe();
        }
    }
    return ret;
}

function dicomGetShort(stream, groupNumber, bigEndian)
{
    var ret = 0;
    if (groupNumber == 0x2)
    {
        ret = stream.readUShortLe();
    }
    else
    {
        ret = bigEndian ? stream.readUShortBe() : stream.readUShortLe();
    }
    return ret;
}

function dicomGetInt(stream, groupNumber, bigEndian)
{
    var ret = 0;
    if (groupNumber == 0x2)
    {
        ret = stream.readUIntLe();
    }
    else
    {
        ret = bigEndian ? stream.readUIntBe() : stream.readUIntLe();
    }
    return ret;
}

function dicomGetFloat(stream, groupNumber, bigEndian)
{
    var ret = 0;
    if (groupNumber == 0x2)
    {
        ret = stream.readFloatLe();
    }
    else
    {
        bigEndian ? stream.readFloatBe() : stream.readFloatLe();
    }
    return ret;
}

function dicomGetNumeric(stream, groupNumber, bigEndian, explicitVR)
{
    var ret = 0, len;
    if (explicitVR)
    {
        var v1 = stream.readAsciiString(1), v2 = stream.readAsciiString(1);
        len = dicomGetShort(stream, groupNumber, bigEndian);
        if (v1 == 'U' && v2 == 'S')
        {
            if (len != 2)
                throw "Incorrect size for a US field.";
            ret = dicomGetShort(stream, groupNumber, bigEndian);
        }
        else if (v1 == 'U' && v2 == 'L')
        {
            if (len != 4)
                throw "Incorrect size for a UL field.";
            ret = dicomGetInt(stream, groupNumber, bigEndian);
        }
        else if (v1 == 'S' && v2 == 'S')
        {
            if (len != 2)
                throw "Incorrect size for a SS field.";
            ret = dicomGetShort(stream, groupNumber, bigEndian);
        }
        else if (v1 == 'S' && v2 == 'L')
        {
            if (len != 4)
                throw "Incorrect size for a SL field.";
            ret = dicomGetInt(stream, groupNumber, bigEndian);
        }
        else if (v1 == 'I' && v2 == 'S' && len < 16)
        {
            try { ret = parseInt(stream.readAsciiString(len)); }
            catch(e) { }
        }
        else
        {
            stream.seek(len, 1);
        }
    }
    else
    {
        len = dicomGetInt(stream, groupNumber, bigEndian);
        if (len == 2)
            ret = dicomGetShort(stream, groupNumber, bigEndian);
        else if (len == 4)
            ret = dicomGetInt(stream, groupNumber, bigEndian);
        else
            stream.seek(len, 1);
    }
    return ret;
}

function dicomSkipElement(stream, groupNumber, elementNumber, bigEndian, explicitVR, results)
{
    var len;
    var str = "";
    if (groupNumber == 0xFFFE)
    {
        len = dicomGetInt(stream, groupNumber, bigEndian);
        if(len > 0)
            stream.seek(len, 1);
    }
    else
    {
        if (explicitVR)
        {
            var dVR = stream.readAsciiString(2);
            if ((dVR == 'OB') || (dVR == 'OW') || (dVR == 'OF') || (dVR == 'SQ') || (dVR == 'UT') || (dVR == 'UN')) {
                dicomGetShort(stream, groupNumber, false);
                len = dicomGetInt(stream, groupNumber, bigEndian);

                if (dVR == 'SQ')
                {
                    var tempShort = dicomGetShort(stream, groupNumber, bigEndian);
                    if (tempShort != 0xFFFE)
                        console.log("Warning: incorrect signature for SQ field.");
                    tempShort = dicomGetShort(stream, groupNumber, bigEndian);
                    if (tempShort != 0xE000)
                        console.log("Warning: incorrect signature for SQ field.");
                    len = dicomGetInt(stream, groupNumber, bigEndian);
                }
                else
                {
                    if (elementNumber != 0)
                    {
                        stream.seek(len, 1);
                    }
                }
            }
            else
            {
                len = dicomGetShort(stream, groupNumber, bigEndian);
                if (len > 0 && len < 1024 && dicomTextWorthyItems.indexOf(dVR) >= 0 && results !== undefined) {
                    results.add(dVR, stream.readAsciiString(len));
                } else {
                    stream.seek(len, 1);
                }
            }
        }
        else
        {
            len = dicomGetInt(stream, groupNumber, bigEndian);
            if (len == -1)
                len = 0;
            stream.seek(len, 1);
        }
    }
}

var dicomTextWorthyItems = [ "LO", "LT", "PN", "SH", "ST", "UT" ];
