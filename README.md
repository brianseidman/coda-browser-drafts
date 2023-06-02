# Coda Browser for Drafts

Coda Browser for Drafts is a [Drafts](https://getdrafts.com) action that assists you in **sending** and **retrieving** information to and from your [Coda](https://coda.io) docs, using Drafts as an intermediary.

Easy setup:

- 💻 Download and install the Coda Browser for Drafts action.
- 🔐 Enter your [Coda API](https://coda.io/account) when prompted.
- 😀 Browse Coda via Drafts. That's it!

## Usage

You will need an API access token from Coda to query your data with the Coda API. To get that token:

- From any Coda page, choose your avatar, then the three vertical dots, and then "Account Settings" (or follow the [Account Settings](https://coda.io/account) link).
- Scroll to "API Settings," and generate an API token with read and write access to your docs.

### Use Cases

- Get doc, table, or column metadata for use in writing other Coda API calls.
- Download row data (JSON) and use it in other Drafts actions.
- Download row data for sending to another Coda doc.
- Download row data, modify it in Drafts, and then send it to the same or a different Coda table (the Coda Browser for Drafts supports upserting based on specified columns).

### Receiving Coda Data

Run the Coda Browser action and choose "Receive."

The Drafts action will show a list of your most recently used docs, followed by a list of the tables within the chosen doc, following by column and row choices. For both docs and tables, you can also choose "Exit to JSON" to download Coda's API metadata for your docs or tables to Drafts.

If you select an individual table, the Drafts action will offer "Rows" or "Exit to Column JSON." The Column JSON is Coda's API metadata for the table's columns, again saved to Drafts. 

"Rows" will give you the option to select specific columns in the table, and then will return all the row data from that table, filtered to the specific columns and saved in Drafts. (This is formatted in "Coda Values format"; see more below.)

### Sending Data to Coda

Run the Coda Browser action and choose "Send."

Coda Browser for Drafts supports sending new data to a Coda table or updating existing data in a Coda table ("upserting") based on a specified column. The Draft action assumes the data to be sent is the current, focused "Drafts draft" and accepts that input in two formats: TSV (tab-separated values) and "Coda Values format."

#### Tab-Separated Values

Coda Browser for Drafts accepts draft input with "row" items separated into "columns" by tabs. For example:

```
Name	Pet
Jon	Garfield
Calvin	Hobbes
```

The first row should consist of the column names, but these do not have to match the actual column names in the Coda table. A dialogue box will allow for mapping the TSV columns to the Coda table columns, with the option of choosing a "key column" row for upserting. 

Behind the scenes, the Drafts action will transform the drafts content from TSV to a JSON format suitable for uploading to Coda ("Coda Values format").

#### Coda Values Format

When using the Draft action's "Receive" option (or using the GET method with the Coda API) to download row data, Coda returns JSON formatted like this:

```
[
  {
    "values": {
      "Name": "Jon",
      "Pet": "Garfield"
    }
  },
  {
    "values": {
      "Name": "Calvin",
      "Pet": "Hobbes"
    }
  }
]
```

However, to send data to a Coda table, the JSON must be formatted like this:

```
{
  "rows": [
    {
      "cells": [
        {
          "column": "Name",
          "value": "Jon"
        },
        {
          "column": "Pet",
          "value": "Garfield"
        }
      ]
    },
    {
      "cells": [
        {
          "column": "Name",
          "value": "Calvin"
        },
        {
          "column": "Pet",
          "value": "Hobbes"
        }
      ]
    }
  ]
}
```

The Coda Browser for Drafts can send "Coda Values format" to Coda, automatically transforming it to the rows/cells format within the action. This allows for retrieving data from Coda in the Coda Values format, modifying the values of the JSON, and then sending the same draft back up to Coda, or retrieving the row data from one table and then sending it to a different table.

As well, any array of objects formatted with a "values" key and then key/value pairs of column name and value can also be used.

## Preferences

The Coda Browser for Alfred is set for choosing between five docs, 20 tables, and 15 columns, sorted by most recently changed and then alphabetically. These limits be changed by modifying the specified variables below, found in the first step of the Drafts action.

```
const limits = {
	"docLimit": 5,
	"tableLimit": 20,
	"columnLimit": 15
}
```
 
## Roadmap

- When retrieving rows, toggles for showing visible data only and using Coda's column ID names.
- Ability to set retrieval limits on a per-session basis.
- Ability to include a search query when retrieving rows.
- Ability to access paginated sets of data.
- Match Draft columns to Coda columns for dialogue prompt when applicable.

## Warning

Using your Coda API key gives you full programmatic access to your Coda docs by design. It is entirely possible for you to overwrite existing data in your Coda docs using the Coda Browser for Drafts (this is often the intended behavior). While Coda does have good versioning functions, please proceed with caution and make backups when necessary. Though this Drafts action has been tested, no guarantee is being made about the absence of bugs or their effects.

## Privacy

No user data is shared with me via this Drafts action. Your Coda API access token is saved directly to Drafts itself (not to the Drafts action) as part of Drafts' [built-in credentialing function](https://docs.getdrafts.com/docs/settings/credentials).

## Thanks

- [Ed Gauthier](https://forums.getdrafts.com/u/edgauthier/summary) for early guidance on writing functions for Drafts actions.
- [Agile Tortoise](https://getdrafts.com) for the fantastic [Drafts](https://getdrafts.com) app!
