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
        var fileList = [];
        var mimeType = "";

        try {
            var zipInfo = zipReadContents(stream, contentResults, fileList);
            if (zipInfo.mimeType !== undefined) {
                mimeType = zipInfo.mimeType;
            }
        } catch (e) {
            console.log("Error while reading OLE contents: " + e);
        }

        var fileExt = "OLE";
        var fileType = "Generic/unknown OLE file";

        if (fileList.indexOf("word/document.xml") >= 0) {
            fileExt = "DOCX";
            fileType = "Microsoft Word (2010 and above) document";
        } else if (fileList.indexOf("ppt/presentation.xml") >= 0) {
            fileExt = "PPTX";
            fileType = "Microsoft PowerPoint (2010 and above) presentation";
        } else if (fileList.indexOf("xl/workbook.xml") >= 0) {
            fileExt = "XLSX";
            fileType = "Microsoft Excel (2010 and above) spreadsheet";
        } else if (fileList.indexOf("FixedDocSeq.fdseq") >= 0) {
            fileExt = "XPS";
            fileType = "Microsoft XPS document";
        } else if (fileList.indexOf("AndroidManifest.xml") >= 0) {
            fileExt = "APK";
            fileType = "Android application package";
        } else if (fileList.indexOf("snote/snote.xml") >= 0) {
            fileExt = "SNB";
            fileType = "Exported Samsung S-Note file";
        } else if (fileList.indexOf("content/riffData.cdr") >= 0) {
            fileExt = "CDR";
            fileType = "CorelDraw image";
        } else if (fileList.indexOf("Root.xml") >= 0 && fileList.indexOf("summary.xml") >= 0) {
            if (fileList.indexOf("preview.png") >= 0) {
                fileExt = "DPP";
                fileType = "Serif DrawPlus document";
            } else if (fileList.indexOf("preview.jpg") >= 0) {
                fileExt = "PPP";
                fileType = "Serif PagePlus document";
            }
        } else if (fileList.indexOf("doc.kml") >= 0) {
            fileExt = "KMZ";
            fileType = "Google Earth location data";
        } else if (mimeType.indexOf("opendocument.text") >= 0) {
            fileExt = "ODT";
            fileType = "OpenDocument text file";
        } else if (mimeType.indexOf("opendocument.spreadsheet") >= 0) {
            fileExt = "ODS";
            fileType = "OpenDocument spreadsheet";
        } else if (mimeType.indexOf("opendocument.presentation") >= 0) {
            fileExt = "ODP";
            fileType = "OpenDocument presentation";
        } else if (mimeType.indexOf("opendocument.graphics") >= 0) {
            fileExt = "ODG";
            fileType = "OpenDocument graphics file";
        } else if (mimeType.indexOf("application/epub") >= 0) {
            fileExt = "EPUB";
            fileType = "Electronic publication or e-book";
        }

        results.add("File type", fileType);
        results.add("File extension", fileExt);
        results.addResult(contentResults);

    } catch(e) {
		console.log("Error while reading OLE: " + e);
	}
	return results;
}

function oleReadContents(stream, results, fileList) {
    while (!stream.eof()) {




    }
}
