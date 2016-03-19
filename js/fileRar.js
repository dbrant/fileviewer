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
	var results = new ResultNode("RAR structure");
	try {
		var stream = new DataStream(reader);
        var blockCrc, blockType, blockFlags;
        var blockSize;

        while (!stream.eof()) {
            blockCrc = stream.readUShortLe();
            blockType = stream.readByte();
            blockFlags = stream.readUShortLe();
            blockSize = stream.readUShortLe();
            if ((blockFlags & 0x8000) != 0) {
                blockSize += stream.readUIntLe();
            }

            results.add("Block 0x" + blockType.toString(16), blockSize.toString() + " bytes");

            if ((blockType == 0x7B) && (blockCrc == 0x3DC4)) {
                //end of file!
                break;
            }

            if ((blockType < 0x72) || (blockType > 0x78)) {
                break;
            }

            if ((blockFlags & 0x8000) != 0) {
                stream.seek(blockSize - 11, 1);
            } else {
                stream.seek(blockSize - 7, 1);
            }
        }

    } catch(e) {
		console.log("Error while reading RAR: " + e);
	}
	return results;
}
