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
	var results = new ResultNode("AMR structure");
	try {
		var stream = new DataStream(reader);
        var headerSize = 0;
        var numChannels = 1;
        var wideBand = false;
        var multiChannel = false;

        if (reader.byteAt(5) == 0xA) {
            // regular single-channel AMR file
            headerSize = 6;
        } else if (reader.byteAt(8) == 0xA) {
            // single-channel AMR-WB file
            headerSize = 9;
            wideBand = true;
        } else if (reader.byteAt(11) == 0xA) {
            // multi-channel AMR file
            multiChannel = true;
            headerSize = 12;
        } else if (reader.byteAt(14) == 0xA) {
            // multi-channel AMR-WB file
            multiChannel = true;
            wideBand = true;
            headerSize = 15;
        }

        results.add("Wide-band", wideBand);

        stream.seek(headerSize, 0);

        if (multiChannel) {
            numChannels = stream.readUIntBe();
        }
        results.add("Channels", numChannels);

    } catch(e) {
		console.log("Error while reading AMR: " + e);
	}
	return results;
}
