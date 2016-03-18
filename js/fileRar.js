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

        while (!stream.eof()) {
            //read chunk type...
            if (stream.readAsciiString(2) != "PK") {
                break;
            }
            chunkType = stream.readUShortLe();

        }

    } catch(e) {
		console.log("Error while reading RAR: " + e);
	}
	return results;
}
