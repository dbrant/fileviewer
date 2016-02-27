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


    } catch(e) {
		console.log("Error while reading ZIP: " + e);
	}
	return results;
}


function zipReadContents(stream, fileList) {
    var headerSig;
    var versionNeeded, flags, compressionMethod;
    var lastModTime, lastModDate, crc32;
    var compressedSize, uncompressedSize, fileNameLength;
    var extraFieldLength;

    while (true) {
        //read local file header...
        headerSig = stream.readUIntLe();

        if (headerSig == 0x04034b50) {
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
            var fileName = stream.readAsciiString(fileNameLength);

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
        } else if (headerSig == 0x08074b50) {

            var dataCrc32 = stream.readUIntLe();
            var dataCompSize = stream.readUIntLe();
            var dataUncompSize = stream.readUIntLe();

        } else if (headerSig == 0x08064b50) {

            //archive extra data record!
            extraFieldLength = stream.readUIntLe();
            stream.seek(extraFieldLength, 1);

        } else if (headerSig == 0x02014b50) {

            //directory file header!
            disk.readBytes(tempBytes, 0, 42);
            fileSize += 42;
            bytePtr = 0;

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

            //read file name...
            disk.readBytes(tempBytes, 0, fileNameLength);
            fileSize += fileNameLength;

            //read extra field...
            disk.readBytes(tempBytes, 0, extraFieldLength);
            fileSize += extraFieldLength;

            //read file comment...
            disk.readBytes(tempBytes, 0, fileCommentLength);
            fileSize += fileCommentLength;
            haveHeader = true;
        } else if (headerSig == 0x05054b50L) {
            fileSize += 4;
            //digital signature!
            disk.readBytes(tempBytes, 0, 2);
            fileSize += 2;
            bytePtr = 0;
            int dataLength = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;

            if (dataLength < 0) {
                break;
            }
            disk.skipBytes(dataLength);
            fileSize += dataLength;
        } else if (headerSig == 0x06064b50L) {
            fileSize += 4;
            //zip64 end of central directory!
            disk.readBytes(tempBytes, 0, 8);
            fileSize += 8;
            bytePtr = 0;
            long sizeOfRecord = getLongLe(tempBytes, bytePtr);
            bytePtr += 8;

            if (sizeOfRecord > 0) {
                disk.skipBytes(sizeOfRecord);
                fileSize += sizeOfRecord;
            }
        } else if (headerSig == 0x07064b50L) {
            fileSize += 4;
            //zip64 end of central dir locator!
            disk.readBytes(tempBytes, 0, 16);
            fileSize += 16;
            bytePtr = 0;

            long numberofDisk = getIntLe(tempBytes, bytePtr);
            bytePtr += 4;
            long offsetToCentralDirRec = getLongLe(tempBytes, bytePtr);
            bytePtr += 8;
            long numTotalDisks = getIntLe(tempBytes, bytePtr);
            bytePtr += 4;
        } else if (headerSig == 0x06054b50L) {
            fileSize += 4;
            //directory file header!
            disk.readBytes(tempBytes, 0, 18);
            fileSize += 18;
            bytePtr = 0;

            int diskNumber = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            int numDiskWithCentralDir = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            int localCentralDirEntries = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            int totalCentralDirEntries = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            long sizeOfCentralDir = getIntLe(tempBytes, bytePtr);
            bytePtr += 4;
            long offsetToCentralDir = getIntLe(tempBytes, bytePtr);
            bytePtr += 4;
            int zipCommentLength = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;

            if (zipCommentLength < 0) {
                break;
            }
            fileSize += zipCommentLength;
            disk.skipBytes(zipCommentLength);
            haveHeader = true;
        } else {
            break;
        }

    }

}
