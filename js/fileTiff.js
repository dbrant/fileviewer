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
	var results = new ResultNode("TIFF structure");

    try {
        var exifStream = new DataStream(reader);
        var exifTagList = getTiffInfo(exifStream, 0);
        var thumbOffset = 0, thumbLength = 0;
        for (var i = 0; i < exifTagList.length; i++) {
            results.add("[0x" + exifTagList[i].tagID.toString(16).toUpperCase() + "] " + getTiffTagName(exifTagList[i].tagID, exifTagList[i].ifdTag, exifTagList[i].makerNoteType), exifTagList[i].tagContents);

            if (exifTagList[i].tagID == 513) {
                thumbOffset = parseInt(exifTagList[i].tagContents);
            }
            else if (exifTagList[i].tagID == 514) {
                thumbLength = parseInt(exifTagList[i].tagContents);
            }
            if (thumbOffset > 0 && thumbLength > 0) {
                var thumbString = "data:image/png;base64," + base64FromArrayBuffer(reader.dataView.buffer, thumbOffset, thumbLength);
                var thumbHtml = "<img class='previewImage' src='" + thumbString + "' />";
                results.add("Thumbnail", thumbHtml);
                reader.onGetPreviewImage(thumbString);
                thumbOffset = 0;
                thumbLength = 0;
            }
        }
    } catch(e) {
        console.log("Error while reading TIFF: " + e);
    }
    return results;
}
