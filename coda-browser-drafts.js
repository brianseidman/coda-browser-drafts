const limits = {
	docLimit: 5,
	tableLimit: 20,
	columnLimit: 15,
};

"use strict";

const f = () => {

	// Makes new Draft with supplied content; returns true
	function exitToDraft(content) {
		const d = new Draft();
		d.content = JSON.stringify(content, null, 2);
		d.update();
		editor.load(d);
		return true;
	}

	// Makes request to Coda API; returns JSON response from Coda
	function talkCoda(url, data, method = "GET") {

		const doTalk = (requestObject) => HTTP.create().request(requestObject).responseData

		const makeReqObj = {
			"encoding": "json",
			"url": url,
			"method": method,
			"headers": {
				"Content-type": "application/json; charset=UTF-8",
				"Authorization": `Bearer ${codaCredential.getValue("codaApi")}`
			}
		}

		if (data) {
			makeReqObj.data = data
		}

		return doTalk(makeReqObj)
	}

	function doDocTableProcess(url, extras, choiceType) {

		// Returns Coda JSON, sorted by name key
		const codaJson = talkCoda(`${url}${extras}`).items.sort((a, b) => a.name > b.name);

		// Contains URL, "exit," or false
		const choiceCodaJsonPrompt = makeDocTablePrompt(codaJson);

		// Returns URL, "exit," or false
		function makeDocTablePrompt(docTableJson) {

			const docTablePrompt = new Prompt()
			docTablePrompt.title = "Options"
			docTablePrompt.message = `Choose a ${choiceType}:`

			const promptButtons = docTableJson.map((v) => [v.name, v.href])

			choiceReceiveOrSend === "Receive" &&
				promptButtons.push(["Exit to JSON", "exit"]);

			promptButtons.map(([name, value]) => docTablePrompt.addButton(name, value))

			return docTablePrompt.show() && docTablePrompt.buttonPressed;
		}

		if (!choiceCodaJsonPrompt) {
			return false;
		} else {
			const choice = (choiceCodaJsonPrompt.match(/tables|exit/g) || ["repeat"]).toString()
			const docTableChoices = {
				"exit": function() {
					return exitToDraft(codaJson)
				},
				"tables": function() {
					return doReceiveSendProcess(choiceCodaJsonPrompt)
				},
				"repeat": function() {
					return doDocTableProcess(choiceCodaJsonPrompt, `/tables?tableTypes=table&limit=${limits.tableLimit}`, "table")
				},
			};
			return docTableChoices[choice]()
		}

	}

	function doReceiveSendProcess(choiceTableJsonPrompt) {

		const listOfColumnNames = talkCoda(`${choiceTableJsonPrompt}/columns?&useColumnNames=true`).items.map((column) => column.name);

		return choiceReceiveOrSend === "Receive" ? doReceiveProcess() : doSendProcess()

		function doReceiveProcess() {

			const columnRowPrompt = new Prompt()
			columnRowPrompt.title = "Columns or Rows";
			columnRowPrompt.message = "Choose an option:";
			["Rows", "Exit to Columns JSON"].map((v) => columnRowPrompt.addButton(v))
			
			// Contains false, "Rows," or "Exit to Columns JSON"
			const choiceColumnRow = columnRowPrompt.show() && columnRowPrompt.buttonPressed;

			const rowColumnChoices = {
				"Exit to Columns JSON": function() {
					const columnJson = talkCoda(`${choiceTableJsonPrompt}/columns?useColumnNames=true&limit=${limits.columnLimit}`);
					return exitToDraft(columnJson)
				},
				"Rows": function() {
					return rowProcess()
				}
			};

			// Returns draft of filtered values object and exits with true
			function rowProcess() {

				const rowColumnPrompt = new Prompt()
				rowColumnPrompt.title = "Fields";
				rowColumnPrompt.addSelect("fields", "Choose fields to include:", listOfColumnNames, [], true);
				rowColumnPrompt.addButton("OK")
				// rowColumnPrompt.addSwitch("visible", "Visible only", false);
				// rowColumnPrompt.addSwitch("columnName", "Use column names", true);
				// rowColumnPrompt.addSwitch("limit", "Limit", false);
				// rowColumnPrompt.addSwitch("doQuery", "Include query", false);

				// Array of column names or false
				const choiceRowColumns = rowColumnPrompt.show() && rowColumnPrompt.fieldValues

				if (!choiceRowColumns) return false

				// Contains URL
				const rowUrl = `${choiceTableJsonPrompt}/rows?visibleOnly=${choiceRowColumns.visible}&useColumnNames=${choiceRowColumns.columnName}`;

				// Contains items object
				const rowJson = talkCoda(rowUrl).items;

				// Contains values object
				const filteredRowJson = rowJson.map((rows) => ({
					values: Object.fromEntries(
						Object.entries(rows.values).filter(([key, val]) =>
							choiceRowColumns.fields.includes(key)
						)
					),
				}));
				
				return exitToDraft(filteredRowJson)
			}
			
			if (!choiceColumnRow) {
				return false 
			} else {
				return rowColumnChoices[choiceColumnRow]()
			}

		}

		function doSendProcess() {

			function tsvJson(doc) {

				const rowItems = doc
					.replaceAll("\r\n", "\n")
					.split("\n")
					.map((rowItem) => rowItem.split("\t"));

				const keyRow = rowItems.shift()

				return rowItems.map((rowItem) => ({
					"values": Object.fromEntries(rowItem.map((item, index) => [keyRow[index], item]))
				}))

			}

			function cellify(valuesJson, promptValues = { "keyColumn": "" }, codaColumnList) {

				Object.defineProperty(promptValues, "keyColumn", { "enumerable": false })

				function doCellify(arr) {
					return {
						"rows": arr.map(element => ({
							"cells": element.map(([key, value]) => ({
								"column": key,
								"value": value
							}))
						}))
					}
				}

				const hasLength = Object.entries(promptValues).length > 0;
				const hasValue = hasLength ? parseInt(promptValues.keyColumn) !== 0 : promptValues.keyColumn.length > 0;

				const codaValues = valuesJson.map(({ values	}) => Object.entries(promptValues)
					.map(([key, value]) => [codaColumnList[value], values[key]]));

				const draftValues = valuesJson.map(({ values }) => values)
					.map((element) => Object.entries(element));

				const cellifyObject = doCellify(hasLength ? codaValues : draftValues)

				const choicesKeyColumn = {
					"true": {
						"true": function() {
							return cellifyObject.keyColumns = [codaColumnList[promptValues.keyColumn - 1]]
						},
						"false": function() {
							return null
						}
					},
					"false": {
						"true": function() {
							return cellifyObject.keyColumns = [promptValues.keyColumn]
						},
						"false": function() {
							return null
						}
					}

				}

				choicesKeyColumn[hasLength][hasValue]()

				return cellifyObject

			}
			
			// Contains current draft as a JSON object
			const draftJson = testIfJson(draft.content);

			function testIfJson(draftContent) {
				try {
					JSON.parse(draftContent);
				} catch (error) {
					return tsvJson(draftContent);
				}
				return JSON.parse(draftContent);
			}

			if (Object.keys(draftJson[0].values)[0] === "") {
				alert("Draft is blank or not in the correct format.")
				return false
			}
			
			// Contains Draft "column" keys from first values instance in JSON
			const draftFirstRowKeys = Object.keys(draftJson[0].values);
			
			const columnNamesWithNone = ["None", ...listOfColumnNames];

			const rowMatchPrompt = new Prompt();
			rowMatchPrompt.title = "Row Match";
			rowMatchPrompt.message = "Match local columns to Coda columns, and choose a key column:";
			
			// For matching Draft columns to Coda columns — addPicker(name, label, [columns], [selectedRows])
			draftFirstRowKeys.map((key, index) => rowMatchPrompt.addPicker(key, key, [listOfColumnNames], [index]));
			rowMatchPrompt.addPicker("keyColumn", "Key Columns", [columnNamesWithNone], [0]);
			
			rowMatchPrompt.addButton("OK");

			const rowMatchValues = rowMatchPrompt.show() && rowMatchPrompt.fieldValues;

			if (!rowMatchValues) {
				return false
			} else {
				alert(JSON.stringify(talkCoda(`${choiceTableJsonPrompt}/rows?useColumnNames=true`,
					cellify(draftJson, rowMatchValues, listOfColumnNames), "POST")))
				return true
			}
		}

	}

	const codaCredential = Credential.create("Coda", "Your Coda API key (saved in Drafts, not shared)");

	codaCredential.addPasswordField("codaApi", "Coda API key");

	codaCredential.authorize()

	const makeSendPrompt = new Prompt()
	makeSendPrompt.title = "Methods";
	makeSendPrompt.message = "Choose a method:";
	["Receive", "Send"].map(button => makeSendPrompt.addButton(button))

	// Contains "Receieve," "Send," or false
	const choiceReceiveOrSend =
		makeSendPrompt.show() && makeSendPrompt.buttonPressed;

	if (!choiceReceiveOrSend) {
		return false
	} else {
		return doDocTableProcess("https://coda.io/apis/v1/docs", `?limit=${limits.docLimit}`, "doc");
	}
}

if (!f()) {
	app.displayErrorMessage("Function canceled");
	context.cancel();
}