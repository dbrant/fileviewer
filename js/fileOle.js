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
	var results = new ResultNode("OLE structure");
	try {
		var stream = new DataStream(reader);

        var contentResults = new ResultNode("OLE contents");
        var dirList = [];

        try {
            oleReadContents(stream, contentResults, dirList);
        } catch (e) {
            console.log("Error while reading OLE contents: " + e);
        }

        var fileExt = "OLE";
        var fileType = "Generic/unknown OLE file";

        if (dirList.indexOf("WordDocument") >= 0) {
            fileExt = "DOC";
            fileType = "Microsoft Word (2007 and older) document";
        } else if (dirList.indexOf("Workbook") >= 0) {
            fileExt = "XLS";
            fileType = "Microsoft Excel (2007 and older) spreadsheet";
        } else if (oleDirListItemContains(dirList, "PowerPoint")) {
            fileExt = "PPT";
            fileType = "Microsoft PowerPoint (2007 and older) presentation";
        } else if (oleDirListItemContains(dirList, "Visio")) {
            fileExt = "VSD";
            fileType = "Microsoft Visio (2007 and older) document";
        } else if (oleDirListItemContains(dirList, "Revit")) {
            fileExt = "RVT";
            fileType = "Revit drawing";
        } else if (oleDirListItemContains(dirList, "FlexiSIGN")) {
            fileExt = "FS";
            fileType = "FlexiSign document";
        } else if (dirList.indexOf("Quill") >= 0 || dirList.indexOf("Escher") >= 0) {
            fileExt = "PUB";
            fileType = "Microsoft Publisher (2007 and older) document";
        } else if (dirList.indexOf("QESession") >= 0) {
            fileExt = "RPT";
            fileType = "Crystal Reports document";
        } else if (dirList.indexOf("CONTENTS") >= 0) {
            fileExt = "WPS";
            fileType = "Microsoft Outlook document";
        } else if (dirList.indexOf("Data") >= 0 && dirList.indexOf("Audio") >= 0 && oleDirListItemContains(dirList, "data")) {
            fileExt = "CP";
            fileType = "Adobe Captivate document";
        } else if (dirList.indexOf("Scene") >= 0) {
            fileExt = "MAX";
            fileType = "3DS Max document";
        } else if (dirList.indexOf("NativeContent_MAIN") >= 0) {
            fileExt = "QPW";
            fileType = "Quattro Pro workbook";
        } else if (dirList.indexOf("PerfectOffice_MAIN") >= 0) {
            fileExt = "WB3";
            fileType = "Quattro Pro version 3 workbook";
        } else if (dirList.indexOf("ISolidWorksInformation") >= 0 || dirList.indexOf("swXmlContents") >= 0 || (dirList.indexOf("CMgr") >= 0 && dirList.indexOf("ThirdPty") >= 0)) {
            fileExt = "SLDPRT";
            fileType = "SolidWorks part document";
        } else if (dirList.indexOf("Root Entry") >= 0 && dirList.indexOf("DocName") >= 0 && dirList.indexOf("Document") >= 0) {
            fileExt = "PPP";
            fileType = "Serif PagePlus document";
        }

        results.add("File type", fileType);
        results.add("File extension", fileExt);
        results.addResult(contentResults);

    } catch(e) {
		console.log("Error while reading OLE: " + e);
	}
	return results;
}

function oleDirListItemContains(dirList, testString) {
    for (var i = 0; i < dirList.length; i++) {
        if (dirList[i].indexOf(testString) >= 0) {
            return true;
        }
    }
    return false;
}

function oleReadContents(stream, results, dirNames) {
    stream.seek(24, 0);

    var oleMinorVer = stream.readUShortLe();
    var oleDllVer = stream.readUShortLe();
    var oleByteOrder = stream.readUShortLe();
    var oleSectorShift = stream.readUShortLe();
    var oleMiniSectorShift = stream.readUShortLe();
    var oleSectorSize = (1 << oleSectorShift);

    stream.seek(10, 1);

    if ((oleSectorShift != 0x9) && (oleSectorShift != 0xC)) {
        console.log("Warning: bad oleSectorShift");
        return;
    }

    var oleNumFatBlocks = stream.readUIntLe();
    var oleRootStartBlock = stream.readUIntLe();
    var oleDfSig = stream.readUIntLe();
    var oleMiniSectorCutoff = stream.readUIntLe();
    var oleDirFlag = stream.readUIntLe();
    var oleCSectMiniFat = stream.readUIntLe();
    var oleFatNextBlock = stream.readUIntLe();
    var oleNumExtraFatBlocks = stream.readUIntLe();

    if (oleNumFatBlocks > 100000) {
        console.log("Warning: bad oleNumFatBlocks");
        return;
    }
    if (oleNumExtraFatBlocks > 100000) {
        console.log("Warning: bad oleNumExtraFatBlocks");
        return;
    }

    var numFatEntries = 0;
    var fatOffset = 0;
    if (oleNumFatBlocks == 0) {
        fatOffset = stream.position;
        numFatEntries = 109;
    }
    else {
        fatOffset = (stream.readUIntLe() << oleSectorShift) + oleSectorSize;
        numFatEntries = ((oleNumFatBlocks << oleSectorShift) / 4);
    }

    if (numFatEntries > 65535) {
        console.log("Warning: bad numFatEntries");
        return;
    }

    var i = 0;
    var blockOffset;
    var badStuff = false;
    for (var block = oleRootStartBlock; (block < numFatEntries) && (i < numFatEntries); i++) {
        if (block == 0xFFFFFFFE) {
            break;
        }
        var offsetRootDir = oleSectorSize + (block << oleSectorShift);
        var sid;

        for (sid = 0; sid < oleSectorSize / 128; sid++) {
            stream.seek(offsetRootDir, 0);

            var dirName = stream.readUtf16LeString(64);
            var nameSize = stream.readUShortLe();
            nameSize = (nameSize / 2 - 1);
            if (nameSize > 2048) {
                badStuff = true;
                break;
            }
            if (nameSize < 32) {
                dirName = dirName.substring(0, nameSize);

                var dirType = stream.readByte();
                if (dirType == 0) {
                    break;
                }
                var dirFlags = stream.readByte();
                var prevDirent = stream.readUIntLe();
                var nextDirent = stream.readUIntLe();
                var sidChild = stream.readUIntLe();
                // clsid (16 bytes)
                //ehh... don't care about the rest

                results.add("Directory entry", dirName);
                dirNames.push(dirName);
            }

            offsetRootDir += 128;
        }
        if (badStuff) {
            break;
        }

        //read the next block
        {
            blockOffset = (block * 4 + fatOffset);
            stream.seek(blockOffset, 0);
            block = stream.readUIntLe();
        }
    }
}
