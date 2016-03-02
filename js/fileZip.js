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
	var results = new ResultNode("ZIP structure");
	try {
		var stream = new DataStream(reader);

        var fileList = [];
        zipReadContents(stream, results, fileList);

        for (var i = 0; i < fileList.length; i++) {
            //results.add(fileList[i]);
        }

    } catch(e) {
		console.log("Error while reading ZIP: " + e);
	}
	return results;
}

function zipReadContents(stream, results, fileList) {
    var chunkType;
    var fileName;
    var versionNeeded, flags, compressionMethod;
    var lastModTime, lastModDate, crc32;
    var compressedSize, uncompressedSize, fileNameLength;
    var extraFieldLength;
    var node;

    while (!stream.eof()) {
        //read chunk type...
        if (stream.readAsciiString(2) != "PK") {
            break;
        }
        chunkType = stream.readUShortLe();

        node = results.add("0x" + chunkType.toString(16), zipChunkName(chunkType));

        if (chunkType == 0x0403) {
            //compressed file data!
            versionNeeded = stream.readUShortLe();
            flags = stream.readUShortLe();
            compressionMethod = stream.readUShortLe();
            lastModTime = stream.readUShortLe();
            lastModDate = stream.readUShortLe();

            crc32 = stream.readUIntLe();
            compressedSize = stream.readUIntLe();
            uncompressedSize = stream.readUIntLe();
            fileNameLength = stream.readUShortLe();
            extraFieldLength = stream.readUShortLe();

            //sanity
            if (fileNameLength > 10000) {
                break;
            }

            //read file name...
            fileName = stream.readAsciiString(fileNameLength);

            node.add("Name", fileName);
            node.add("Size (compressed)", compressedSize);
            node.add("Size (uncompressed)", uncompressedSize);

            if (fileList !== null) {
                fileList.push(fileName);
            }

            stream.seek(extraFieldLength, 1);
            stream.seek(compressedSize, 1);

            //read data descriptor?
            if ((flags & 0x8) != 0) {
                //int s = SearchForSig(disk, new byte[]{0x50, 0x4B, 0x7, 0x8}, 10000);
                //if (s >= 0) {
                //    fileSize += s;
                //} else {
                //    haveHeader = false;
                //    break;
                //}
            }
        } else if (chunkType == 0x0807) {

            var dataCrc32 = stream.readUIntLe();
            var dataCompSize = stream.readUIntLe();
            var dataUncompSize = stream.readUIntLe();

            node.add("Size (compressed)", dataCompSize);
            node.add("Size (uncompressed)", dataUncompSize);

        } else if (chunkType == 0x0806) {

            //archive extra data record!
            extraFieldLength = stream.readUIntLe();
            stream.seek(extraFieldLength, 1);

            node.add("Size", extraFieldLength);

        } else if (chunkType == 0x0201) {

            //directory file header!
            var versionMadeBy = stream.readUShortLe();
            versionNeeded = stream.readUShortLe();
            flags = stream.readUShortLe();
            compressionMethod = stream.readUShortLe();
            lastModTime = stream.readUShortLe();
            lastModDate = stream.readUShortLe();

            crc32 = stream.readUIntLe();
            compressedSize = stream.readUIntLe();
            uncompressedSize = stream.readUIntLe();
            fileNameLength = stream.readUShortLe();
            extraFieldLength = stream.readUShortLe();
            var fileCommentLength = stream.readUShortLe();
            var diskNumberStart = stream.readUShortLe();
            var internalFileAttr = stream.readUShortLe();
            var externalFileAttr = stream.readUIntLe();
            var relHeaderOffset = stream.readUIntLe();

            fileName = stream.readAsciiString(fileNameLength);

            node.add("Name", fileName);
            node.add("Size (compressed)", compressedSize);
            node.add("Size (uncompressed)", uncompressedSize);

            //read extra field...
            stream.seek(extraFieldLength, 1);

            //read file comment...
            if (fileCommentLength > 0 && fileCommentLength < 4096) {
                var fileComment = stream.readAsciiString(fileCommentLength);
                node.add("Comment", fileComment);
            } else {
                stream.seek(fileCommentLength, 1);
            }

        } else if (chunkType == 0x0505) {

            //digital signature!
            var dataLength = stream.readUShortLe();
            stream.seek(dataLength, 1);

            node.add("Size", dataLength);

        } else if (chunkType == 0x0606) {

            //zip64 end of central directory!
            var sizeOfRecord = stream.readLongLe();
            if (sizeOfRecord > 0) {
                stream.seek(sizeOfRecord, 1);
            }

            node.add("Size", sizeOfRecord);

        } else if (chunkType == 0x0706) {

            //zip64 end of central dir locator!
            var numberofDisk = stream.readUIntLe();
            var offsetToCentralDirRec = stream.readLongLe();
            var numTotalDisks = stream.readUIntLe();

        } else if (chunkType == 0x0605) {

            //directory file header!
            var diskNumber = stream.readUShortLe();
            var numDiskWithCentralDir = stream.readUShortLe();
            var localCentralDirEntries = stream.readUShortLe();
            var totalCentralDirEntries = stream.readUShortLe();
            var sizeOfCentralDir = stream.readUIntLe();
            var offsetToCentralDir = stream.readUIntLe();
            var zipCommentLength = stream.readUShortLe();

            if (zipCommentLength > 0 && zipCommentLength < 4096) {
                var zipComment = stream.readAsciiString(zipCommentLength);
                node.add("Comment", zipComment);
            } else {
                stream.seek(zipCommentLength, 1);
            }

        } else {
            break;
        }
    }
}

function zipChunkName(id) {
    switch (id)
    {
        case 0x0403: return "Local file header";
        case 0x0806: return "Archive extra data";
        case 0x0201: return "Central directory file header";
        case 0x0505: return "Digital signature";
        case 0x0606: return "Zip64 end of central directory record";
        case 0x0706: return "Zip64 end of central directory locator";
        case 0x0605: return "End of central directory record";
    }
    return "Unknown";
}