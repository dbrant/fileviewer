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
        ret = stream.readAsciiString(entry.numValues - 1);
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
            if (tiffWikiLinkableTags.indexOf(exifTag.tagID) >= 0) {
                exifTag.tagContents = "<a href='https://en.wikipedia.org/wiki/" + valStr + "' target='_blank'>" + valStr + "</a>";
            } else {
                exifTag.tagContents = valStr;
            }
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
    var name;
    if (ifdType == IfdTagGPS)
    {
        name = tiffGpsIfdTags.get(tag);
    }
    else if (ifdType == IfdTagMakernote)
    {
        if (makernoteType == MakerNoteFujiFilm)
        {
            name = tiffFujiIfdTags.get(tag);
        }
        else if (makernoteType == MakerNoteNikon3)
        {
            name = tiffNikonIfdTags.get(tag);
        }
    }
    else if (ifdType == IfdTagMPF)
    {
        name = tiffMpfIfdTags.get(tag);
    }
    else
    {
        name = tiffMainIfdTags.get(tag);
    }
    if (name.length == 0) {
        name = tag.toString() + " (0x" + tag.toString(16) + ")";
    }
    return name;
}

// ---------------------------------------------------------------------

var tiffWikiLinkableTags = [ 0x10F, 0x110 ];

var _tiffGpsIfdTags = function() {
    this.keys = [];
    this.keys[0] = "GPS info version";
    this.keys[1] = "GPS Latitude N/S";
    this.keys[2] = "GPS latitude";
    this.keys[3] = "GPS Longitude E/W";
    this.keys[4] = "GPS longitude";
    this.keys[5] = "GPS altitude ref";
    this.keys[6] = "GPS altitude";
    this.keys[7] = "GPS UTC time";
    this.keys[8] = "GPS satellites";
    this.keys[9] = "GPS status";
    this.keys[10] = "GPS measurement mode";
    this.keys[11] = "GPS degree of precision";
    this.keys[12] = "GPS speed ref";
    this.keys[13] = "GPS speed";
    this.keys[14] = "GPS direction ref";
    this.keys[15] = "GPS direction";
    this.keys[16] = "GPS image direction ref";
    this.keys[17] = "GPS image direction";
    this.keys[18] = "GPS map datum";
    this.keys[19] = "GPS dest latitude ref";
    this.keys[20] = "GPS dest latitude";
    this.keys[21] = "GPS dest longitude ref";
    this.keys[22] = "GPS dest longitude";
    this.keys[23] = "GPS dest bearing ref";
    this.keys[24] = "GPS dest bearing";
    this.keys[25] = "GPS dest distance ref";
    this.keys[26] = "GPS dest distance";
    this.keys[27] = "GPS processing method";
    this.keys[28] = "GPS area information";
    this.keys[29] = "GPS date stamp";
    this.keys[30] = "GPS differential correction";

    this.get = function(tag) {
        return this.keys[tag] === undefined ? "" : this.keys[tag];
    }
};
var tiffGpsIfdTags = new _tiffGpsIfdTags();

var _tiffFujiIfdTags = function() {
    this.keys = [];
    this.keys[0] = "Makernote version";
    this.keys[16] = "Serial number";
    this.keys[4096] = "Quality";
    this.keys[4097] = "Sharpness";
    this.keys[4098] = "White balance";
    this.keys[4099] = "Color saturation";
    this.keys[4100] = "Tone (contrast)";
    this.keys[4112] = "Flash mode";
    this.keys[4113] = "Flash strength";
    this.keys[4128] = "Macro";
    this.keys[4129] = "Focus mode";
    this.keys[4144] = "Slow sync";
    this.keys[4145] = "Picture mode";
    this.keys[4146] = "Burst count";
    this.keys[4352] = "Auto bracketing";
    this.keys[4353] = "Sequence number";
    this.keys[4624] = "FinePix color setting";
    this.keys[4864] = "Blur warning";
    this.keys[4865] = "Focus warning";
    this.keys[4866] = "Auto exposure warning";
    this.keys[5120] = "Dynamic range";
    this.keys[5121] = "Film mode";
    this.keys[5122] = "Dynamic range settings";
    this.keys[5123] = "Development dynamic range";
    this.keys[5124] = "Minimum focal length";
    this.keys[5125] = "Maximum focal length";
    this.keys[5126] = "Max aperture at min focal";
    this.keys[5127] = "Max aperture at max focal";
    this.keys[32768] = "File source";
    this.keys[32770] = "Order number";
    this.keys[32771] = "Frame number";

    this.get = function(tag) {
        return this.keys[tag] === undefined ? "" : this.keys[tag];
    }
};
var tiffFujiIfdTags = new _tiffFujiIfdTags();

var _tiffNikonIfdTags = function() {
    this.keys = [];
    this.keys[1] = "Makernote version";
    this.keys[2] = "ISO speed used";
    this.keys[3] = "Color mode";
    this.keys[4] = "Quality";
    this.keys[5] = "White balance";
    this.keys[6] = "Sharpening";
    this.keys[7] = "Focus mode";
    this.keys[8] = "Flash setting";
    this.keys[9] = "Auto flash mode";
    this.keys[11] = "White balance bias";
    this.keys[12] = "White balance coefficients";
    this.keys[13] = "Program shift";
    this.keys[14] = "Exposure difference";
    this.keys[15] = "ISO selection";
    this.keys[16] = "Data dump";
    this.keys[17] = "Preview IFD";
    this.keys[18] = "Flash compensation";
    this.keys[19] = "ISO speed requested";
    this.keys[22] = "Photo corner coordinates";
    this.keys[23] = "External flash exposure compensation";
    this.keys[24] = "Flash bracket compensation applied";
    this.keys[25] = "Exposure bracket value";

    this.keys[0x1A] = "Image processing";
    this.keys[0x1B] = "CropHiSpeed";
    this.keys[0x1C] = "Exposure tuning";
    this.keys[0x1D] = "Serial number";
    this.keys[0x1E] = "Color space";
    this.keys[0x1F] = "VRInfo";
    this.keys[0x20] = "Image authentication";
    this.keys[0x21] = "Face detect";
    this.keys[0x22] = "Active D-Lighting";
    this.keys[0x23] = "Picture control data";
    this.keys[0x24] = "World time";
    this.keys[0x25] = "ISO info";
    this.keys[0x2A] = "Vignette control";
    this.keys[0x2B] = "Distort info";

    this.keys[0x35] = "HDR info";
    this.keys[0x39] = "Location info";

    this.keys[128] = "Image adjustment";
    this.keys[129] = "Tone compensation";
    this.keys[130] = "Auxiliary lens";
    this.keys[131] = "Lens type";
    this.keys[132] = "Lens info";
    this.keys[133] = "Manual focus distance";
    this.keys[134] = "Digital zoom factor";
    this.keys[135] = "Flash used";
    this.keys[136] = "Auto focus area";
    this.keys[137] = "Bracketing and shooting mode";
    this.keys[139] = "Lens F-stops";
    this.keys[140] = "Contrast curve";
    this.keys[141] = "Color hue";
    this.keys[143] = "Scene mode";
    this.keys[144] = "Light source";
    this.keys[145] = "Shot info";
    this.keys[146] = "Hue adjustment";
    this.keys[147] = "NEF compression";
    this.keys[148] = "Saturation";
    this.keys[149] = "Noise reduction";
    this.keys[150] = "NEF linearization table";
    this.keys[0x97] = "Color balance";
    this.keys[0x98] = "Lens data";
    this.keys[0x99] = "Raw image center";
    this.keys[0x9A] = "Sensor pixel size";
    this.keys[0x9C] = "Scene assist";
    this.keys[0x9E] = "Retouch history";

    this.keys[0xA0] = "Serial number";
    this.keys[0xA2] = "Image data size";
    this.keys[0xA5] = "Image count";
    this.keys[0xA6] = "Deleted image count";
    this.keys[0xA7] = "Shutter count";
    this.keys[0xA8] = "Flash info";
    this.keys[0xA9] = "Image optimization";
    this.keys[0xAA] = "Saturation";
    this.keys[0xAB] = "VariProgram";
    this.keys[0xAC] = "Image stabilization";
    this.keys[0xAD] = "AF response";
    this.keys[0xB0] = "MultiExposure";
    this.keys[0xB1] = "High ISO noise reduction";
    this.keys[0xB3] = "Toning effect";
    this.keys[0xB6] = "Power-up time";
    this.keys[0xB7] = "AF Info 2";
    this.keys[0xB8] = "File info";
    this.keys[0xB9] = "AF tune";
    this.keys[0xBD] = "PictureControl data";
    this.keys[0xE00] = "PrintIM data";
    this.keys[0xE01] = "Nikon capture data";
    this.keys[0xE09] = "Nikon capture version";
    this.keys[0xE0E] = "Nikon capture offsets";
    this.keys[0xE10] = "Nikon scan IFD";
    this.keys[0xE13] = "Nikon capture edit versions";
    this.keys[0xE1D] = "Nikon ICC profile";
    this.keys[0xE1E] = "Nikon capture output";
    this.keys[0xE22] = "NEF bit depth";

    this.get = function(tag) {
        return this.keys[tag] === undefined ? "" : this.keys[tag];
    }
};
var tiffNikonIfdTags = new _tiffNikonIfdTags();

var _tiffMpfIfdTags = function() {
    this.keys = [];
    this.keys[45056] = "MP format version";
    this.keys[45057] = "MP number of images";
    this.keys[45058] = "MP entry";
    this.keys[45059] = "MP unique ID list";
    this.keys[45060] = "MP total captured frames";
    this.keys[45313] = "MP individual image number";

    this.get = function(tag) {
        return this.keys[tag] === undefined ? "" : this.keys[tag];
    }
};
var tiffMpfIfdTags = new _tiffMpfIfdTags();

var _tiffMainIfdTags = function() {
    this.keys = [];
    this.keys[1] = "InteropIndex";
    this.keys[2] = "InteropVersion";
    this.keys[11] = "ProcessingSoftware";

    this.keys[254] = "Subfile type (new)";
    this.keys[255] = "Subfile type";
    this.keys[256] = "Width";
    this.keys[257] = "Height";
    this.keys[258] = "Bits per sample";
    this.keys[259] = "Compression";
    this.keys[262] = "Photometric interpretation";
    this.keys[263] = "Threshholding";
    this.keys[264] = "Cell width";
    this.keys[265] = "Cell length";
    this.keys[266] = "Fill order";
    this.keys[269] = "Document name";
    this.keys[270] = "Image description";
    this.keys[271] = "Camera make";
    this.keys[272] = "Camera model";
    this.keys[274] = "Orientation";
    this.keys[277] = "Samples per pixel";
    this.keys[278] = "Rows per strip";
    this.keys[280] = "Min sample value";
    this.keys[281] = "Max sample value";
    this.keys[282] = "X resolution";
    this.keys[283] = "Y resolution";
    this.keys[284] = "Planar configuration";
    this.keys[285] = "Page name";
    this.keys[286] = "X position";
    this.keys[287] = "Y position";
    this.keys[290] = "Gray response unit";
    this.keys[291] = "Gray response curve";
    this.keys[292] = "T4 options";
    this.keys[293] = "T6 options";
    this.keys[296] = "Resolution unit";
    this.keys[297] = "Page number";
    this.keys[301] = "Transfer function";
    this.keys[305] = "Software";
    this.keys[306] = "Create date";
    this.keys[315] = "Artist";
    this.keys[316] = "Host computer";
    this.keys[317] = "Predictor";
    this.keys[318] = "White point";
    this.keys[319] = "Primary chromaticities";
    this.keys[320] = "Color map";
    this.keys[321] = "Halftone hints";
    this.keys[322] = "Tile width";
    this.keys[323] = "Tile length";
    this.keys[332] = "Ink set";
    this.keys[333] = "Ink names";
    this.keys[334] = "Number of inks";
    this.keys[336] = "Dot range";
    this.keys[337] = "Target printer";
    this.keys[338] = "Extra samples";
    this.keys[339] = "Sample format";
    this.keys[340] = "SMin sample value";
    this.keys[341] = "SMax sample value";
    this.keys[342] = "Transfer range";
    this.keys[343] = "Clip path";
    this.keys[344] = "X clip path units";
    this.keys[345] = "Y clip path units";
    this.keys[346] = "Indexed";
    this.keys[347] = "JPEG tables";
    this.keys[351] = "OPI proxy";

    this.keys[400] = "Global parameters IFD";
    this.keys[401] = "Profile type";
    this.keys[402] = "Fax profile";
    this.keys[403] = "Coding methods";
    this.keys[404] = "Version year";
    this.keys[405] = "Mode number";
    this.keys[433] = "Decode";
    this.keys[434] = "Default image color";

    this.keys[512] = "JPEG proc";
    this.keys[513] = "Thumbnail offset";
    this.keys[514] = "Thunbmail size";
    this.keys[515] = "JPEG restart interval";
    this.keys[517] = "JPEG lossless predictors";
    this.keys[518] = "JPEG point transforms";
    this.keys[519] = "JPEG quantization tables";
    this.keys[520] = "JPEG DC tables";
    this.keys[521] = "JPEG AC tables";
    this.keys[529] = "YCbCr coefficients ";
    this.keys[530] = "YCbCr subsampling";
    this.keys[531] = "YCbCr positioning";
    this.keys[532] = "Reference black/white";
    this.keys[559] = "Strip row counts";

    this.keys[700] = "XMP metadata";

    this.keys[4096] = "Related image file format";
    this.keys[4097] = "Related image width";
    this.keys[4098] = "Related image height";

    this.keys[18246] = "Rating";
    this.keys[18247] = "XP_DIP_XML";
    this.keys[18248] = "Stitch info";
    this.keys[18249] = "Rating percent";

    this.keys[32781] = "Image ID";
    this.keys[32932] = "Wang annotation";
    this.keys[33421] = "CFA repeat pattern dimension";
    this.keys[33422] = "CFA pattern";
    this.keys[33423] = "Battery level";
    this.keys[33432] = "Copyright";
    this.keys[33434] = "Exposure time";
    this.keys[33437] = "F-number";

    this.keys[33445] = "MD file tag";
    this.keys[33446] = "MD scale pixel";
    this.keys[33447] = "MD color table";
    this.keys[33448] = "MD lab name";
    this.keys[33449] = "MD sample info";
    this.keys[33450] = "MD prep date";
    this.keys[33451] = "MD prep time";
    this.keys[33452] = "MD file units";
    this.keys[33550] = "Model pixel scale tag";

    this.keys[33723] = "IPTC/NAA";
    this.keys[34377] = "Photoshop settings";
    this.keys[34675] = "ICC profile";
    this.keys[34732] = "Image layer";
    this.keys[34850] = "Exposure program";
    this.keys[34852] = "Spectral sensitivity";
    this.keys[34853] = "GPS IFD";
    this.keys[34855] = "ISO speed ratings";
    this.keys[34856] = "Opto-electric conversion function";
    this.keys[34857] = "Interlace";
    this.keys[34858] = "Time zone offset";
    this.keys[34859] = "Self-timer mode";

    this.keys[34864] = "Sensitivity type";
    this.keys[34865] = "Standard output sensitivity";
    this.keys[34866] = "Recommended exposure index";
    this.keys[34867] = "ISO speed";
    this.keys[34868] = "ISO speed latitude yyy";
    this.keys[34869] = "ISO speed latitude zzz";

    this.keys[36864] = "Exif version";
    this.keys[36867] = "DateTime original";
    this.keys[36868] = "DateTime digitized";

    this.keys[37121] = "Components configuration";
    this.keys[37122] = "Compressed bits per pixel";

    this.keys[37377] = "Shutter speed";
    this.keys[37378] = "Aperture";
    this.keys[37379] = "Brightness";
    this.keys[37380] = "Exposure bias";
    this.keys[37381] = "Max aperture";
    this.keys[37382] = "Subject distance";
    this.keys[37383] = "Metering mode";
    this.keys[37384] = "Light source";
    this.keys[37385] = "Flash";
    this.keys[37386] = "Focal length";
    this.keys[37387] = "Flash energy";
    this.keys[37388] = "Spatial frequency response";
    this.keys[37389] = "Noise";
    this.keys[37390] = "Focal plane X resolution";
    this.keys[37391] = "Focal plane Y resolution";
    this.keys[37392] = "Focal plane resolution unit";
    this.keys[37393] = "Image number";
    this.keys[37394] = "Security classification";
    this.keys[37395] = "Image history";
    this.keys[37396] = "Subject location";
    this.keys[37397] = "Exposure index";
    this.keys[37398] = "Standard ID";
    this.keys[37399] = "Sensing method";

    this.keys[37500] = "Maker note";
    this.keys[37510] = "User comment";
    this.keys[37520] = "DateTime second fraction";
    this.keys[37521] = "DateTimeOriginal second fraction";
    this.keys[37522] = "DateTimeDigitized second fraction";

    this.keys[40091] = "XP Title";
    this.keys[40092] = "XP Comment";
    this.keys[40093] = "XP Author";
    this.keys[40094] = "XP Keywords";
    this.keys[40095] = "XP Subject";
    this.keys[40960] = "Flashpix version";
    this.keys[40961] = "Color space";
    this.keys[40962] = "PixelXDimension";
    this.keys[40963] = "PixelYDimension";
    this.keys[40964] = "Related sound file";

    this.keys[41483] = "Flash energy";
    this.keys[41484] = "Spatial frequency response";
    this.keys[41486] = "Focal plane x-resolution";
    this.keys[41487] = "Focal plane y-resolution";
    this.keys[41488] = "Focal plane resolution unit";
    this.keys[41492] = "Subject location";
    this.keys[41493] = "Exposure index";
    this.keys[41495] = "Sensing method";
    this.keys[41728] = "File source";
    this.keys[41729] = "Scene type";
    this.keys[41730] = "Color filter array patern";
    this.keys[41985] = "Custom rendered";
    this.keys[41986] = "Exposure mode";
    this.keys[41987] = "White balance";
    this.keys[41988] = "Digital zoom ratio";
    this.keys[41989] = "Focal length 35mm-equivalent";
    this.keys[41990] = "Scene capture type";
    this.keys[41991] = "Gain control";
    this.keys[41992] = "Contrast";
    this.keys[41993] = "Saturation";
    this.keys[41994] = "Sharpness";
    this.keys[41995] = "Device setting description";
    this.keys[41996] = "Subject distance range";
    this.keys[42016] = "Image unique ID";
    this.keys[42240] = "Gamma";

    this.keys[45569] = "Panorama scanning orientation";
    this.keys[45570] = "Panorama horizontal overlap";
    this.keys[45571] = "Panorama vertial overlap";
    this.keys[45572] = "Base viewpoint number";
    this.keys[45573] = "Convergence angle";
    this.keys[45574] = "Baseline length";
    this.keys[45575] = "Divergence angle";
    this.keys[45576] = "Horizontal axis distance";
    this.keys[45577] = "Vertical axis distance";
    this.keys[45578] = "Collimation axis distance";
    this.keys[45579] = "Yaw angle";
    this.keys[45580] = "Pitch angle";
    this.keys[45581] = "Roll angle";

    this.keys[50341] = "PrintIM information";
    this.keys[50706] = "DNG version";
    this.keys[50707] = "DNG backward version";
    this.keys[50708] = "Unique camera model";
    this.keys[50709] = "Localized camera model";
    this.keys[50710] = "CFA plane color";
    this.keys[50711] = "CFA layout";

    this.keys[0xc618] = "LinearizationTable";
    this.keys[0xc619] = "BlackLevelRepeatDim";
    this.keys[0xc61a] = "BlackLevel";
    this.keys[0xc61b] = "BlackLevelDeltaH";
    this.keys[0xc61c] = "BlackLevelDeltaV";
    this.keys[0xc61d] = "WhiteLevel";
    this.keys[0xc61e] = "DefaultScale";
    this.keys[0xc61f] = "DefaultCropOrigin";
    this.keys[0xc620] = "DefaultCropSize";
    this.keys[0xc621] = "ColorMatrix1";
    this.keys[0xc622] = "ColorMatrix2";
    this.keys[0xc623] = "CameraCalibration1";
    this.keys[0xc624] = "CameraCalibration2";
    this.keys[0xc625] = "ReductionMatrix1";
    this.keys[0xc626] = "ReductionMatrix2";
    this.keys[0xc627] = "AnalogBalance";
    this.keys[0xc628] = "AsShotNeutral";
    this.keys[0xc629] = "AsShotWhiteXY";
    this.keys[0xc62a] = "BaselineExposure";
    this.keys[0xc62b] = "BaselineNoise";
    this.keys[0xc62c] = "BaselineSharpness";
    this.keys[0xc62d] = "BayerGreenSplit";
    this.keys[0xc62e] = "LinearResponseLimit";
    this.keys[0xc62f] = "CameraSerialNumber";
    this.keys[0xc630] = "DNGLensInfo";
    this.keys[0xc631] = "ChromaBlurRadius";
    this.keys[0xc632] = "AntiAliasStrength";
    this.keys[0xc633] = "ShadowScale";
    this.keys[0xc634] = "SR2Private";
    this.keys[0xc635] = "MakerNoteSafety";
    this.keys[0xc640] = "RawImageSegmentation";
    this.keys[0xc65a] = "CalibrationIlluminant1";
    this.keys[0xc65b] = "CalibrationIlluminant2";
    this.keys[0xc65c] = "BestQualityScale";
    this.keys[0xc65d] = "RawDataUniqueID";
    this.keys[0xc660] = "AliasLayerMetadata";
    this.keys[0xc68b] = "OriginalRawFileName";
    this.keys[0xc68c] = "OriginalRawFileData";
    this.keys[0xc68d] = "ActiveArea";
    this.keys[0xc68e] = "MaskedAreas";
    this.keys[0xc68f] = "AsShotICCProfile";
    this.keys[0xc690] = "AsShotPreProfileMatrix";
    this.keys[0xc691] = "CurrentICCProfile";
    this.keys[0xc692] = "CurrentPreProfileMatrix";
    this.keys[0xc6bf] = "ColorimetricReference";
    this.keys[0xc6d2] = "PanasonicTitle";
    this.keys[0xc6d3] = "PanasonicTitle2";
    this.keys[0xc6f3] = "CameraCalibrationSig";
    this.keys[0xc6f4] = "ProfileCalibrationSig";
    this.keys[0xc6f5] = "ProfileIFD";
    this.keys[0xc6f6] = "AsShotProfileName";
    this.keys[0xc6f7] = "NoiseReductionApplied";
    this.keys[0xc6f8] = "ProfileName";
    this.keys[0xc6f9] = "ProfileHueSatMapDims";
    this.keys[0xc6fa] = "ProfileHueSatMapData1";
    this.keys[0xc6fb] = "ProfileHueSatMapData2";
    this.keys[0xc6fc] = "ProfileToneCurve";
    this.keys[0xc6fd] = "ProfileEmbedPolicy";
    this.keys[0xc6fe] = "ProfileCopyright";
    this.keys[0xc714] = "ForwardMatrix1";
    this.keys[0xc715] = "ForwardMatrix2";
    this.keys[0xc716] = "PreviewApplicationName";
    this.keys[0xc717] = "PreviewApplicationVersion";
    this.keys[0xc718] = "PreviewSettingsName";
    this.keys[0xc719] = "PreviewSettingsDigest";
    this.keys[0xc71a] = "PreviewColorSpace";
    this.keys[0xc71b] = "PreviewDateTime";
    this.keys[0xc71c] = "RawImageDigest";
    this.keys[0xc71d] = "OriginalRawFileDigest";
    this.keys[0xc71e] = "SubTileBlockSize";
    this.keys[0xc71f] = "RowInterleaveFactor";
    this.keys[0xc725] = "ProfileLookTableDims";
    this.keys[0xc726] = "ProfileLookTableData";
    this.keys[0xc740] = "OpcodeList1";
    this.keys[0xc741] = "OpcodeList2";
    this.keys[0xc74e] = "OpcodeList3";
    this.keys[0xc761] = "NoiseProfile";
    this.keys[0xea1c] = "Padding";
    this.keys[0xea1d] = "OffsetSchema";
    this.keys[0xfde8] = "OwnerName";
    this.keys[0xfde9] = "SerialNumber";
    this.keys[0xfdea] = "Lens";
    this.keys[0xfe00] = "KDC_IFD";
    this.keys[0xfe4c] = "RawFile";
    this.keys[0xfe4d] = "Converter";
    this.keys[0xfe4e] = "WhiteBalance";
    this.keys[0xfe51] = "Exposure";
    this.keys[0xfe52] = "Shadows";
    this.keys[0xfe53] = "Brightness";
    this.keys[0xfe54] = "Contrast";
    this.keys[0xfe55] = "Saturation";
    this.keys[0xfe56] = "Sharpness";
    this.keys[0xfe57] = "Smoothness";
    this.keys[0xfe58] = "MoireFilter";

    this.get = function(tag) {
        return this.keys[tag] === undefined ? "" : this.keys[tag];
    }
};
var tiffMainIfdTags = new _tiffMainIfdTags();
