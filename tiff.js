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

var tiffTypeSize = [ 0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8 ];

var tiffDirEntry = function() {
    this.dirTag = 0;
    this.fieldType = 0;
    this.numValues = 0;
    this.valueOffset = 0;
};

var exifDataTag = function() {
    this.tagID = 0;
    this.ifdTag = 0;
    this.makerNoteType = 0;
    this.tagContents = "";
    this.tagHex = "";
};

var IfdTagGPS = 0x8825;
var IfdTagMakernote = 37500;
var IfdTagMPF = 0x1234;

var MakerNoteFujiFilm = 1;
var MakerNoteNikon1 = 2;
var MakerNoteNikon2 = 3;
var MakerNoteNikon3 = 4;


function getEntryContents32(entry, stream, bigEndian) {
    var ret = [], i;
    if (entry.numValues > 10000) {
        return ret;
    }

    //can it fit into four bytes?
    if ((tiffTypeSize[entry.fieldType] == 1) && (entry.numValues <= 4))
    {
        var bytes = uintToBytesBe(entry.valueOffset);
        for (i = 0; i < entry.numValues; i++) {
            ret.push(bytes[i]);
        }
    }
    else if ((tiffTypeSize[entry.fieldType] == 2) && (entry.numValues <= 2))
    {
        var shorts = bigEndian ? uintToShortsBe(entry.valueOffset) : uintToShortsLe(entry.valueOffset);
        for (i = 0; i < entry.numValues; i++) {
            ret.push(shorts[i]);
        }
    }
    else if ((tiffTypeSize[entry.fieldType] == 4) && (entry.numValues == 1))
    {
        ret.push(entry.valueOffset);
    }
    else
    {
        //looks like we have to get it the hard way...
        stream.reset();
        stream.skip(entry.valueOffset);
        for (i = 0; i < entry.numValues; i++)
        {
            if (tiffTypeSize[entry.fieldType] == 1)
            {
                ret.push(stream.readByte());
            }
            else if (tiffTypeSize[entry.fieldType] == 2)
            {
                ret.push(bigEndian ? stream.readUShortBe() : stream.readUShortLe());
            }
            else if (tiffTypeSize[entry.fieldType] == 4)
            {
                ret.push(bigEndian ? stream.readUIntBe() : stream.readUIntLe());
            }
        }
    }
    return ret;
}

function getEntryContents32Signed(entry, stream, bigEndian) {
    var ret = [], i;
    if (entry.numValues > 10000) {
        return ret;
    }
    //can it fit into four bytes?
    if ((tiffTypeSize[entry.fieldType] == 1) && (entry.numValues <= 4))
    {
        var bytes = uintToBytesBe(entry.valueOffset);
        for (i = 0; i < entry.numValues; i++) {
            ret.push(bytes[i] < 128 ? bytes[i] : bytes[i] - 256);
        }
    }
    else if ((tiffTypeSize[entry.fieldType] == 2) && (entry.numValues <= 2))
    {
        var shorts = bigEndian ? uintToShortsBe(entry.valueOffset) : uintToShortsLe(entry.valueOffset);
        for (i = 0; i < entry.numValues; i++) {
            ret.push(shorts[i] < 32768 ? shorts[i] : shorts[i] - 65536);
        }
    }
    else if ((tiffTypeSize[entry.fieldType] == 4) && (entry.numValues == 1))
    {
        ret.push(entry.valueOffset < 2147483648 ? entry.valueOffset : entry.valueOffset - 4294967296);
    }
    else
    {
        //looks like we have to get it the hard way...
        stream.reset();
        stream.skip(entry.valueOffset);
        for (i = 0; i < entry.numValues; i++)
        {
            if (tiffTypeSize[entry.fieldType] == 1)
            {
                var b = stream.readByte();
                ret.push(b < 128 ? b : b - 256);
            }
            else if (tiffTypeSize[entry.fieldType] == 2)
            {
                ret.push(bigEndian ? stream.readShortBe() : stream.readShortLe());
            }
            else if (tiffTypeSize[entry.fieldType] == 4)
            {
                ret.push(bigEndian ? stream.readIntBe() : stream.readIntLe());
            }
        }
    }
    return ret;
}

function getEntryContentsRational(entry, stream, bigEndian) {
    var ret = [];
    if (entry.numValues > 1024) {
        return ret;
    }
    stream.reset();
    stream.skip(entry.valueOffset);
    for (var i = 0; i < entry.numValues; i++)
    {
        var numerator = bigEndian ? stream.readUIntBe() : stream.readUIntLe();
        var denominator = bigEndian ? stream.readUIntBe() : stream.readUIntLe();
        if (denominator == 0) {
            denominator = 1;
        }
        ret.push(numerator / denominator);
    }
    return ret;
}

function getEntryContentsRationalSigned(entry, stream, bigEndian) {
    var ret = [];
    if (entry.numValues > 1024) {
        return ret;
    }
    stream.reset();
    stream.skip(entry.valueOffset);
    for (var i = 0; i < entry.numValues; i++)
    {
        var numerator = bigEndian ? stream.readIntBe() : stream.readIntLe();
        var denominator = bigEndian ? stream.readIntBe() : stream.readIntLe();
        if (denominator == 0) {
            denominator = 1;
        }
        ret.push(numerator / denominator);
    }
    return ret;
}

function getEntryContentsFloat(entry, stream, bigEndian) {
    var ret = [];
    if (entry.numValues > 1024) {
        return ret;
    }
    if (entry.numValues == 1) {
        var buf = new ArrayBuffer(4);
        (new Uint32Array(buf))[0] = entry.valueOffset;
        ret.push((new Float32Array(buf))[0]);
    } else {
        stream.reset();
        stream.skip(entry.valueOffset);
        for (var i = 0; i < entry.numValues; i++) {
            ret.push(bigEndian ? stream.readFloatBe() : stream.readFloatLe());
        }
    }
    return ret;
}

function getEntryContentsDouble(entry, stream, bigEndian) {
    var ret = [];
    if (entry.numValues > 1024) {
        return ret;
    }
    stream.reset();
    stream.skip(entry.valueOffset);
    for (var i = 0; i < entry.numValues; i++) {
        ret.push(bigEndian ? stream.readDoubleBe() : stream.readDoubleLe());
    }
    return ret;
}


function getEntryContentsAscii(entry, stream, bigEndian) {
    var ret = "";
    if ((entry.numValues == 0) || (entry.numValues > 4096)) {
        return ret;
    }

    //can it fit into four bytes?
    if (entry.numValues <= 4)
    {
        var bytes = bigEndian ? uintToBytesBe(entry.valueOffset) : uintToBytesLe(entry.valueOffset);
        for (var i = 0; i < entry.numValues; i++) {
            ret += String.fromCharCode(bytes[i]);
        }
    }
    else
    {
        // get it the hard way...
        stream.reset();
        stream.skip(entry.valueOffset);
        ret = stream.readAsciiString(entry.numValues);
    }
    return ret;
}


function parseTiffDir(stream, bigEndian, ifdOffset, ifdTag, extraIfdOffset, makerNoteType, tagList, level) {
    if (level > 8) {
        return 0;
    }
    var i;

    stream.reset();
    stream.skip(ifdOffset);

    var numDirEntries = bigEndian ? stream.readUShortBe() : stream.readUShortLe();
    var entryList = [];

    for (i = 0; i < numDirEntries; i++) {
        var entry = new tiffDirEntry();
        entryList.push(entry);
        entry.dirTag = bigEndian ? stream.readUShortBe() : stream.readUShortLe();
        entry.fieldType = bigEndian ? stream.readUShortBe() : stream.readUShortLe();
        entry.numValues = bigEndian ? stream.readUIntBe() : stream.readUIntLe();
        entry.valueOffset = bigEndian ? stream.readUIntBe() : stream.readUIntLe();

        //can it fit into four bytes?
        if (((tiffTypeSize[entry.fieldType] == 1) && entry.numValues <= 4) ||
            ((tiffTypeSize[entry.fieldType] == 2) && entry.numValues <= 2) ||
            ((tiffTypeSize[entry.fieldType] == 4) && entry.numValues == 1))
        {
            //don't worry about it
        }
        else
        {
            entry.valueOffset += extraIfdOffset;
        }
    }

    var nextIfdOffset = bigEndian ? stream.readUIntBe() : stream.readUIntLe();

    for (i = 0; i < entryList.length; i++) {
        entry = entryList[i];
        if (entry.dirTag == 273) //strip offsets!
        {
        }
        else if (entry.dirTag == 279) //strip byte counts!
        {
        }
        else if (entry.dirTag == 324) //tile offsets!
        {
        }
        else if (entry.dirTag == 325) //tile byte counts!
        {
        }
        else if (entry.dirTag == 288) //free offsets!
        {
        }
        else if (entry.dirTag == 289) //free byte counts!
        {
        }
        else if ((entry.dirTag == 330) || (entry.dirTag == 34853) || (entry.dirTag == 40965) || (entry.dirTag == 34665))
        {
            //sub-ifd / GPS-ifd / Interop-ifd / EXIF-ifd
            var subIfdList = getEntryContents32(entry, stream, bigEndian);
            for (var subIfdIndex = 0; subIfdIndex < subIfdList.length; subIfdIndex++)
            {
                var tempIfd = subIfdList[subIfdIndex];
                for (var j = 0; j < 32; j++)
                {
                    tempIfd = parseTiffDir(stream, bigEndian, tempIfd, entry.dirTag, 0, 0, tagList, level + 1);
                    if (tempIfd == 0) {
                        break;
                    }
                }
            }
        }
        else if (entry.dirTag == 37500)
        {
            //special handling for Makernote... (manufacturer-dependent!)
            if (entry.numValues > 16) {
                stream.reset();
                stream.skip(entry.valueOffset);

                var makerStr = stream.readAsciiString(4);
                if (makerStr == "FUJI") {
                    stream.skip(4);
                    var fujiIfdOffset = stream.readUIntLe();
                    parseTiffDir(stream, bigEndian, entry.valueOffset + fujiIfdOffset, entry.dirTag, entry.valueOffset, MakerNoteFujiFilm, tagList, level + 1);
                }
                else if (makerStr == "Niko") {
                    stream.skip(1);
                    var b1 = stream.readByte();
                    var b2 = stream.readByte();
                    if (b1 == 0 && b2 == 1) {
                        // Nikon type-1 data
                        // (don't have a sample to test yet)
                    }
                    else if (b1 == 0 && b2 == 2) {
                        //Nikon type-3 data (not a typo)
                        stream.skip(3);
                        makerStr = stream.readAsciiString(2);
                        var nikonEndian = makerStr == "MM";
                        stream.skip(2);
                        var nikonIfdOffset = nikonEndian ? stream.readUIntBe() : stream.readUIntLe();
                        //(stream, bigEndian, ifdOffset, ifdTag, extraIfdOffset, makerNoteType, tagList, level)
                        parseTiffDir(stream, nikonEndian, entry.valueOffset + 10 + nikonIfdOffset, entry.dirTag, entry.valueOffset + 2 + nikonIfdOffset, MakerNoteNikon3, tagList, level + 1);
                    }
                }
            }
        }
        else
        {
            var valueList = [];

            if (entry.fieldType == 2) {
                valueList.push(getEntryContentsAscii(entry, stream, bigEndian));
            }
            else if (entry.fieldType == 5)
            {
                valueList = getEntryContentsRational(entry, stream, bigEndian);
            }
            else if (entry.fieldType == 10)
            {
                valueList = getEntryContentsRationalSigned(entry, stream, bigEndian);
            }
            else if ((entry.fieldType == 1) || (entry.fieldType == 3) || (entry.fieldType == 4))
            {
                valueList = getEntryContents32(entry, stream, bigEndian);
            }
            else if ((entry.fieldType == 6) || (entry.fieldType == 7) || (entry.fieldType == 8) || (entry.fieldType == 9))
            {
                valueList = getEntryContents32Signed(entry, stream, bigEndian);
            }
            else if (entry.fieldType == 11)
            {
                valueList = getEntryContentsFloat(entry, stream, bigEndian);
            }
            else if (entry.fieldType == 12)
            {
                valueList = getEntryContentsDouble(entry, stream, bigEndian);
            }

            var valStr = "";
            if (valueList.length == 1) {
                valStr = valueList[0].toString();
            } else {
                for (var valIndex = 0; valIndex < valueList.length; valIndex++) {
                    if (valIndex > 0) {
                        valStr += " ";
                    }
                    valStr += valueList[valIndex].toString();

                    if (valIndex > 64) {
                        // TODO: remove this if you want to see all the data.
                        valStr += " ...";
                        break;
                    }
                }
            }

            var exifTag = new exifDataTag();
            exifTag.tagID = entry.dirTag;
            exifTag.ifdTag = ifdTag;
            exifTag.makerNoteType = makerNoteType;
            exifTag.tagContents = valStr;
            tagList.push(exifTag);
        }
    }
    return nextIfdOffset;
}

function getTiffInfo(stream, topLevelIfdTag) {
    var tagList = [];

    var endianStr = stream.readAsciiString(2);
    var bigEndian = endianStr == "MM";
    stream.skip(2);
    var ifdOffset = bigEndian ? stream.readUIntBe() : stream.readUIntLe();

    for (var i = 0; i < 32; i++) {
        ifdOffset = parseTiffDir(stream, bigEndian, ifdOffset, topLevelIfdTag, 0, 0, tagList, 0);
        if (ifdOffset == 0) {
            break;
        }
    }
    return tagList;
}


function getTiffTagName(tag, ifdType, makernoteType) {
    var name = tag.toString() + " (0x" + tag.toString(16) + ")";

    if (ifdType == IfdTagGPS)
    {
        switch (tag)
        {
            //GPS stuff...
            case 0: name = "GPS info version"; break;
            case 1: name = "GPS Latitude N/S"; break;
            case 2: name = "GPS latitude"; break;
            case 3: name = "GPS Longitude E/W"; break;
            case 4: name = "GPS longitude"; break;
            case 5: name = "GPS altitude ref"; break;
            case 6: name = "GPS altitude"; break;
            case 7: name = "GPS UTC time"; break;
            case 8: name = "GPS satellites"; break;
            case 9: name = "GPS status"; break;
            case 10: name = "GPS measurement mode"; break;
            case 11: name = "GPS degree of precision"; break;
            case 12: name = "GPS speed ref"; break;
            case 13: name = "GPS speed"; break;
            case 14: name = "GPS direction ref"; break;
            case 15: name = "GPS direction"; break;
            case 16: name = "GPS image direction ref"; break;
            case 17: name = "GPS image direction"; break;
            case 18: name = "GPS map datum"; break;
            case 19: name = "GPS dest latitude ref"; break;
            case 20: name = "GPS dest latitude"; break;
            case 21: name = "GPS dest longitude ref"; break;
            case 22: name = "GPS dest longitude"; break;
            case 23: name = "GPS dest bearing ref"; break;
            case 24: name = "GPS dest bearing"; break;
            case 25: name = "GPS dest distance ref"; break;
            case 26: name = "GPS dest distance"; break;
            case 27: name = "GPS processing method"; break;
            case 28: name = "GPS area information"; break;
            case 29: name = "GPS date stamp"; break;
            case 30: name = "GPS differential correction"; break;

        }
    }
    else if (ifdType == IfdTagMakernote)
    {
        if (makernoteType == MakerNoteFujiFilm)
        {
            switch (tag)
            {
                case 0: name = "Makernote version"; break;
                case 16: name = "Serial number"; break;
                case 4096: name = "Quality"; break;
                case 4097: name = "Sharpness"; break;
                case 4098: name = "White balance"; break;
                case 4099: name = "Color saturation"; break;
                case 4100: name = "Tone (contrast)"; break;
                case 4112: name = "Flash mode"; break;
                case 4113: name = "Flash strength"; break;
                case 4128: name = "Macro"; break;
                case 4129: name = "Focus mode"; break;
                case 4144: name = "Slow sync"; break;
                case 4145: name = "Picture mode"; break;
                case 4146: name = "Burst count"; break;
                case 4352: name = "Auto bracketing"; break;
                case 4353: name = "Sequence number"; break;
                case 4624: name = "FinePix color setting"; break;
                case 4864: name = "Blur warning"; break;
                case 4865: name = "Focus warning"; break;
                case 4866: name = "Auto exposure warning"; break;
                case 5120: name = "Dynamic range"; break;
                case 5121: name = "Film mode"; break;
                case 5122: name = "Dynamic range settings"; break;
                case 5123: name = "Development dynamic range"; break;
                case 5124: name = "Minimum focal length"; break;
                case 5125: name = "Maximum focal length"; break;
                case 5126: name = "Max aperture at min focal"; break;
                case 5127: name = "Max aperture at max focal"; break;
                case 32768: name = "File source"; break;
                case 32770: name = "Order number"; break;
                case 32771: name = "Frame number"; break;

            }
        }
        else if (makernoteType == MakerNoteNikon3)
        {
            switch (tag)
            {
                case 1: name = "Makernote version"; break;
                case 2: name = "ISO speed used"; break;
                case 3: name = "Color mode"; break;
                case 4: name = "Quality"; break;
                case 5: name = "White balance"; break;
                case 6: name = "Sharpening"; break;
                case 7: name = "Focus mode"; break;
                case 8: name = "Flash setting"; break;
                case 9: name = "Auto flash mode"; break;
                case 11: name = "White balance bias"; break;
                case 12: name = "White balance coefficients"; break;
                case 13: name = "Program shift"; break;
                case 14: name = "Exposure difference"; break;
                case 15: name = "ISO selection"; break;
                case 16: name = "Data dump"; break;
                case 17: name = "Preview IFD"; break;
                case 18: name = "Flash compensation"; break;
                case 19: name = "ISO speed requested"; break;
                case 22: name = "Photo corner coordinates"; break;
                case 23: name = "External flash exposure compensation"; break;
                case 24: name = "Flash bracket compensation applied"; break;
                case 25: name = "Exposure bracket value"; break;

                case 0x1A: name = "Image processing"; break;
                case 0x1B: name = "CropHiSpeed"; break;
                case 0x1C: name = "Exposure tuning"; break;
                case 0x1D: name = "Serial number"; break;
                case 0x1E: name = "Color space"; break;
                case 0x1F: name = "VRInfo"; break;
                case 0x20: name = "Image authentication"; break;
                case 0x21: name = "Face detect"; break;
                case 0x22: name = "Active D-Lighting"; break;
                case 0x23: name = "Picture control data"; break;
                case 0x24: name = "World time"; break;
                case 0x25: name = "ISO info"; break;
                case 0x2A: name = "Vignette control"; break;
                case 0x2B: name = "Distort info"; break;

                case 0x35: name = "HDR info"; break;
                case 0x39: name = "Location info"; break;

                case 128: name = "Image adjustment"; break;
                case 129: name = "Tone compensation"; break;
                case 130: name = "Auxiliary lens"; break;
                case 131: name = "Lens type"; break;
                case 132: name = "Lens info"; break;
                case 133: name = "Manual focus distance"; break;
                case 134: name = "Digital zoom factor"; break;
                case 135: name = "Flash used"; break;
                case 136: name = "Auto focus area"; break;
                case 137: name = "Bracketing and shooting mode"; break;
                case 139: name = "Lens F-stops"; break;
                case 140: name = "Contrast curve"; break;
                case 141: name = "Color hue"; break;
                case 143: name = "Scene mode"; break;
                case 144: name = "Light source"; break;
                case 145: name = "Shot info"; break;
                case 146: name = "Hue adjustment"; break;
                case 147: name = "NEF compression"; break;
                case 148: name = "Saturation"; break;
                case 149: name = "Noise reduction"; break;
                case 150: name = "NEF linearization table"; break;
                case 0x97: name = "Color balance"; break;
                case 0x98: name = "Lens data"; break;
                case 0x99: name = "Raw image center"; break;
                case 0x9A: name = "Sensor pixel size"; break;
                case 0x9C: name = "Scene assist"; break;
                case 0x9E: name = "Retouch history"; break;

                case 0xA0: name = "Serial number"; break;
                case 0xA2: name = "Image data size"; break;
                case 0xA5: name = "Image count"; break;
                case 0xA6: name = "Deleted image count"; break;
                case 0xA7: name = "Shutter count"; break;
                case 0xA8: name = "Flash info"; break;
                case 0xA9: name = "Image optimization"; break;
                case 0xAA: name = "Saturation"; break;
                case 0xAB: name = "VariProgram"; break;
                case 0xAC: name = "Image stabilization"; break;
                case 0xAD: name = "AF response"; break;
                case 0xB0: name = "MultiExposure"; break;
                case 0xB1: name = "High ISO noise reduction"; break;
                case 0xB3: name = "Toning effect"; break;
                case 0xB6: name = "Power-up time"; break;
                case 0xB7: name = "AF Info 2"; break;
                case 0xB8: name = "File info"; break;
                case 0xB9: name = "AF tune"; break;
                case 0xBD: name = "PictureControl data"; break;
                case 0xE00: name = "PrintIM data"; break;
                case 0xE01: name = "Nikon capture data"; break;
                case 0xE09: name = "Nikon capture version"; break;
                case 0xE0E: name = "Nikon capture offsets"; break;
                case 0xE10: name = "Nikon scan IFD"; break;
                case 0xE13: name = "Nikon capture edit versions"; break;
                case 0xE1D: name = "Nikon ICC profile"; break;
                case 0xE1E: name = "Nikon capture output"; break;
                case 0xE22: name = "NEF bit depth"; break;

            }
        }
    }
    else if (ifdType == IfdTagMPF)
    {
        switch (tag)
        {
            case 45056: name = "MP format version"; break;
            case 45057: name = "MP number of images"; break;
            case 45058: name = "MP entry"; break;
            case 45059: name = "MP unique ID list"; break;
            case 45060: name = "MP total captured frames"; break;
            case 45313: name = "MP individual image number"; break;
        }
    }
    else
    {
        switch (tag)
        {
            case 1: name = "InteropIndex"; break;
            case 2: name = "InteropVersion"; break;
            case 11: name = "ProcessingSoftware"; break;

            case 254: name = "Subfile type (new)"; break;
            case 255: name = "Subfile type"; break;
            case 256: name = "Width"; break;
            case 257: name = "Height"; break;
            case 258: name = "Bits per sample"; break;
            case 259: name = "Compression"; break;
            case 262: name = "Photometric interpretation"; break;
            case 263: name = "Threshholding"; break;
            case 264: name = "Cell width"; break;
            case 265: name = "Cell length"; break;
            case 266: name = "Fill order"; break;
            case 269: name = "Document name"; break;
            case 270: name = "Image description"; break;
            case 271: name = "Camera make"; break;
            case 272: name = "Camera model"; break;
            case 274: name = "Orientation"; break;
            case 277: name = "Samples per pixel"; break;
            case 278: name = "Rows per strip"; break;
            case 280: name = "Min sample value"; break;
            case 281: name = "Max sample value"; break;
            case 282: name = "X resolution"; break;
            case 283: name = "Y resolution"; break;
            case 284: name = "Planar configuration"; break;
            case 285: name = "Page name"; break;
            case 286: name = "X position"; break;
            case 287: name = "Y position"; break;
            case 290: name = "Gray response unit"; break;
            case 291: name = "Gray response curve"; break;
            case 292: name = "T4 options"; break;
            case 293: name = "T6 options"; break;
            case 296: name = "Resolution unit"; break;
            case 297: name = "Page number"; break;
            case 301: name = "Transfer function"; break;
            case 305: name = "Software"; break;
            case 306: name = "Create date"; break;
            case 315: name = "Artist"; break;
            case 316: name = "Host computer"; break;
            case 317: name = "Predictor"; break;
            case 318: name = "White point"; break;
            case 319: name = "Primary chromaticities"; break;
            case 320: name = "Color map"; break;
            case 321: name = "Halftone hints"; break;
            case 322: name = "Tile width"; break;
            case 323: name = "Tile length"; break;
            case 332: name = "Ink set"; break;
            case 333: name = "Ink names"; break;
            case 334: name = "Number of inks"; break;
            case 336: name = "Dot range"; break;
            case 337: name = "Target printer"; break;
            case 338: name = "Extra samples"; break;
            case 339: name = "Sample format"; break;
            case 340: name = "SMin sample value"; break;
            case 341: name = "SMax sample value"; break;
            case 342: name = "Transfer range"; break;
            case 343: name = "Clip path"; break;
            case 344: name = "X clip path units"; break;
            case 345: name = "Y clip path units"; break;
            case 346: name = "Indexed"; break;
            case 347: name = "JPEG tables"; break;
            case 351: name = "OPI proxy"; break;

            case 400: name = "Global parameters IFD"; break;
            case 401: name = "Profile type"; break;
            case 402: name = "Fax profile"; break;
            case 403: name = "Coding methods"; break;
            case 404: name = "Version year"; break;
            case 405: name = "Mode number"; break;
            case 433: name = "Decode"; break;
            case 434: name = "Default image color"; break;

            case 512: name = "JPEG proc"; break;
            case 513: name = "Thumbnail offset"; break;
            case 514: name = "Thunbmail size"; break;
            case 515: name = "JPEG restart interval"; break;
            case 517: name = "JPEG lossless predictors"; break;
            case 518: name = "JPEG point transforms"; break;
            case 519: name = "JPEG quantization tables"; break;
            case 520: name = "JPEG DC tables"; break;
            case 521: name = "JPEG AC tables"; break;
            case 529: name = "YCbCr coefficients "; break;
            case 530: name = "YCbCr subsampling"; break;
            case 531: name = "YCbCr positioning"; break;
            case 532: name = "Reference black/white"; break;
            case 559: name = "Strip row counts"; break;

            case 700: name = "XMP metadata"; break;

            case 4096: name = "Related image file format"; break;
            case 4097: name = "Related image width"; break;
            case 4098: name = "Related image height"; break;

            case 18246: name = "Rating"; break;
            case 18247: name = "XP_DIP_XML"; break;
            case 18248: name = "Stitch info"; break;
            case 18249: name = "Rating percent"; break;

            case 32781: name = "Image ID"; break;
            case 32932: name = "Wang annotation"; break;
            case 33421: name = "CFA repeat pattern dimension"; break;
            case 33422: name = "CFA pattern"; break;
            case 33423: name = "Battery level"; break;
            case 33432: name = "Copyright"; break;
            case 33434: name = "Exposure time"; break;
            case 33437: name = "F-number"; break;

            case 33445: name = "MD file tag"; break;
            case 33446: name = "MD scale pixel"; break;
            case 33447: name = "MD color table"; break;
            case 33448: name = "MD lab name"; break;
            case 33449: name = "MD sample info"; break;
            case 33450: name = "MD prep date"; break;
            case 33451: name = "MD prep time"; break;
            case 33452: name = "MD file units"; break;
            case 33550: name = "Model pixel scale tag"; break;

            case 33723: name = "IPTC/NAA"; break;
            case 34377: name = "Photoshop settings"; break;
            case 34675: name = "ICC profile"; break;
            case 34732: name = "Image layer"; break;
            case 34850: name = "Exposure program"; break;
            case 34852: name = "Spectral sensitivity"; break;
            case 34853: name = "GPS IFD"; break;
            case 34855: name = "ISO speed ratings"; break;
            case 34856: name = "Opto-electric conversion function"; break;
            case 34857: name = "Interlace"; break;
            case 34858: name = "Time zone offset"; break;
            case 34859: name = "Self-timer mode"; break;

            case 34864: name = "Sensitivity type"; break;
            case 34865: name = "Standard output sensitivity"; break;
            case 34866: name = "Recommended exposure index"; break;
            case 34867: name = "ISO speed"; break;
            case 34868: name = "ISO speed latitude yyy"; break;
            case 34869: name = "ISO speed latitude zzz"; break;

            case 36864: name = "Exif version"; break;
            case 36867: name = "DateTime original"; break;
            case 36868: name = "DateTime digitized"; break;

            case 37121: name = "Components configuration"; break;
            case 37122: name = "Compressed bits per pixel"; break;

            case 37377: name = "Shutter speed"; break;
            case 37378: name = "Aperture"; break;
            case 37379: name = "Brightness"; break;
            case 37380: name = "Exposure bias"; break;
            case 37381: name = "Max aperture"; break;
            case 37382: name = "Subject distance"; break;
            case 37383: name = "Metering mode"; break;
            case 37384: name = "Light source"; break;
            case 37385: name = "Flash"; break;
            case 37386: name = "Focal length"; break;
            case 37387: name = "Flash energy"; break;
            case 37388: name = "Spatial frequency response"; break;
            case 37389: name = "Noise"; break;
            case 37390: name = "Focal plane X resolution"; break;
            case 37391: name = "Focal plane Y resolution"; break;
            case 37392: name = "Focal plane resolution unit"; break;
            case 37393: name = "Image number"; break;
            case 37394: name = "Security classification"; break;
            case 37395: name = "Image history"; break;
            case 37396: name = "Subject location"; break;
            case 37397: name = "Exposure index"; break;
            case 37398: name = "Standard ID"; break;
            case 37399: name = "Sensing method"; break;

            case 37500: name = "Maker note"; break;
            case 37510: name = "User comment"; break;
            case 37520: name = "DateTime second fraction"; break;
            case 37521: name = "DateTimeOriginal second fraction"; break;
            case 37522: name = "DateTimeDigitized second fraction"; break;

            case 40091: name = "XP Title"; break;
            case 40092: name = "XP Comment"; break;
            case 40093: name = "XP Author"; break;
            case 40094: name = "XP Keywords"; break;
            case 40095: name = "XP Subject"; break;
            case 40960: name = "Flashpix version"; break;
            case 40961: name = "Color space"; break;
            case 40962: name = "PixelXDimension"; break;
            case 40963: name = "PixelYDimension"; break;
            case 40964: name = "Related sound file"; break;

            case 41483: name = "Flash energy"; break;
            case 41484: name = "Spatial frequency response"; break;
            case 41486: name = "Focal plane x-resolution"; break;
            case 41487: name = "Focal plane y-resolution"; break;
            case 41488: name = "Focal plane resolution unit"; break;
            case 41492: name = "Subject location"; break;
            case 41493: name = "Exposure index"; break;
            case 41495: name = "Sensing method"; break;
            case 41728: name = "File source"; break;
            case 41729: name = "Scene type"; break;
            case 41730: name = "Color filter array patern"; break;
            case 41985: name = "Custom rendered"; break;
            case 41986: name = "Exposure mode"; break;
            case 41987: name = "White balance"; break;
            case 41988: name = "Digital zoom ratio"; break;
            case 41989: name = "Focal length 35mm-equivalent"; break;
            case 41990: name = "Scene capture type"; break;
            case 41991: name = "Gain control"; break;
            case 41992: name = "Contrast"; break;
            case 41993: name = "Saturation"; break;
            case 41994: name = "Sharpness"; break;
            case 41995: name = "Device setting description"; break;
            case 41996: name = "Subject distance range"; break;
            case 42016: name = "Image unique ID"; break;
            case 42240: name = "Gamma"; break;

            case 45569: name = "Panorama scanning orientation"; break;
            case 45570: name = "Panorama horizontal overlap"; break;
            case 45571: name = "Panorama vertial overlap"; break;
            case 45572: name = "Base viewpoint number"; break;
            case 45573: name = "Convergence angle"; break;
            case 45574: name = "Baseline length"; break;
            case 45575: name = "Divergence angle"; break;
            case 45576: name = "Horizontal axis distance"; break;
            case 45577: name = "Vertical axis distance"; break;
            case 45578: name = "Collimation axis distance"; break;
            case 45579: name = "Yaw angle"; break;
            case 45580: name = "Pitch angle"; break;
            case 45581: name = "Roll angle"; break;

            case 50341: name = "PrintIM information"; break;
            case 50706: name = "DNG version"; break;
            case 50707: name = "DNG backward version"; break;
            case 50708: name = "Unique camera model"; break;
            case 50709: name = "Localized camera model"; break;
            case 50710: name = "CFA plane color"; break;
            case 50711: name = "CFA layout"; break;

            case 0xc618: name = "LinearizationTable"; break;
            case 0xc619: name = "BlackLevelRepeatDim"; break;
            case 0xc61a: name = "BlackLevel"; break;
            case 0xc61b: name = "BlackLevelDeltaH"; break;
            case 0xc61c: name = "BlackLevelDeltaV"; break;
            case 0xc61d: name = "WhiteLevel"; break;
            case 0xc61e: name = "DefaultScale"; break;
            case 0xc61f: name = "DefaultCropOrigin"; break;
            case 0xc620: name = "DefaultCropSize"; break;
            case 0xc621: name = "ColorMatrix1"; break;
            case 0xc622: name = "ColorMatrix2"; break;
            case 0xc623: name = "CameraCalibration1"; break;
            case 0xc624: name = "CameraCalibration2"; break;
            case 0xc625: name = "ReductionMatrix1"; break;
            case 0xc626: name = "ReductionMatrix2"; break;
            case 0xc627: name = "AnalogBalance"; break;
            case 0xc628: name = "AsShotNeutral"; break;
            case 0xc629: name = "AsShotWhiteXY"; break;
            case 0xc62a: name = "BaselineExposure"; break;
            case 0xc62b: name = "BaselineNoise"; break;
            case 0xc62c: name = "BaselineSharpness"; break;
            case 0xc62d: name = "BayerGreenSplit"; break;
            case 0xc62e: name = "LinearResponseLimit"; break;
            case 0xc62f: name = "CameraSerialNumber"; break;
            case 0xc630: name = "DNGLensInfo"; break;
            case 0xc631: name = "ChromaBlurRadius"; break;
            case 0xc632: name = "AntiAliasStrength"; break;
            case 0xc633: name = "ShadowScale"; break;
            case 0xc634: name = "SR2Private"; break;
            case 0xc635: name = "MakerNoteSafety"; break;
            case 0xc640: name = "RawImageSegmentation"; break;
            case 0xc65a: name = "CalibrationIlluminant1"; break;
            case 0xc65b: name = "CalibrationIlluminant2"; break;
            case 0xc65c: name = "BestQualityScale"; break;
            case 0xc65d: name = "RawDataUniqueID"; break;
            case 0xc660: name = "AliasLayerMetadata"; break;
            case 0xc68b: name = "OriginalRawFileName"; break;
            case 0xc68c: name = "OriginalRawFileData"; break;
            case 0xc68d: name = "ActiveArea"; break;
            case 0xc68e: name = "MaskedAreas"; break;
            case 0xc68f: name = "AsShotICCProfile"; break;
            case 0xc690: name = "AsShotPreProfileMatrix"; break;
            case 0xc691: name = "CurrentICCProfile"; break;
            case 0xc692: name = "CurrentPreProfileMatrix"; break;
            case 0xc6bf: name = "ColorimetricReference"; break;
            case 0xc6d2: name = "PanasonicTitle"; break;
            case 0xc6d3: name = "PanasonicTitle2"; break;
            case 0xc6f3: name = "CameraCalibrationSig"; break;
            case 0xc6f4: name = "ProfileCalibrationSig"; break;
            case 0xc6f5: name = "ProfileIFD"; break;
            case 0xc6f6: name = "AsShotProfileName"; break;
            case 0xc6f7: name = "NoiseReductionApplied"; break;
            case 0xc6f8: name = "ProfileName"; break;
            case 0xc6f9: name = "ProfileHueSatMapDims"; break;
            case 0xc6fa: name = "ProfileHueSatMapData1"; break;
            case 0xc6fb: name = "ProfileHueSatMapData2"; break;
            case 0xc6fc: name = "ProfileToneCurve"; break;
            case 0xc6fd: name = "ProfileEmbedPolicy"; break;
            case 0xc6fe: name = "ProfileCopyright"; break;
            case 0xc714: name = "ForwardMatrix1"; break;
            case 0xc715: name = "ForwardMatrix2"; break;
            case 0xc716: name = "PreviewApplicationName"; break;
            case 0xc717: name = "PreviewApplicationVersion"; break;
            case 0xc718: name = "PreviewSettingsName"; break;
            case 0xc719: name = "PreviewSettingsDigest"; break;
            case 0xc71a: name = "PreviewColorSpace"; break;
            case 0xc71b: name = "PreviewDateTime"; break;
            case 0xc71c: name = "RawImageDigest"; break;
            case 0xc71d: name = "OriginalRawFileDigest"; break;
            case 0xc71e: name = "SubTileBlockSize"; break;
            case 0xc71f: name = "RowInterleaveFactor"; break;
            case 0xc725: name = "ProfileLookTableDims"; break;
            case 0xc726: name = "ProfileLookTableData"; break;
            case 0xc740: name = "OpcodeList1"; break;
            case 0xc741: name = "OpcodeList2"; break;
            case 0xc74e: name = "OpcodeList3"; break;
            case 0xc761: name = "NoiseProfile"; break;
            case 0xea1c: name = "Padding"; break;
            case 0xea1d: name = "OffsetSchema"; break;
            case 0xfde8: name = "OwnerName"; break;
            case 0xfde9: name = "SerialNumber"; break;
            case 0xfdea: name = "Lens"; break;
            case 0xfe00: name = "KDC_IFD"; break;
            case 0xfe4c: name = "RawFile"; break;
            case 0xfe4d: name = "Converter"; break;
            case 0xfe4e: name = "WhiteBalance"; break;
            case 0xfe51: name = "Exposure"; break;
            case 0xfe52: name = "Shadows"; break;
            case 0xfe53: name = "Brightness"; break;
            case 0xfe54: name = "Contrast"; break;
            case 0xfe55: name = "Saturation"; break;
            case 0xfe56: name = "Sharpness"; break;
            case 0xfe57: name = "Smoothness"; break;
            case 0xfe58: name = "MoireFilter"; break;

        }
    }
    return name;
}