# NDR Bill Pay API

The Bill Pay API uses a headless chrome browser running on AWS Lambda. As it visits pages and generates screenshots and PDFs, they are written to a S3 bucket for easy debugging.

- The base url for this API is: `https://hxvyxinxh6.execute-api.us-east-1.amazonaws.com/live/api/v1`.
- This API has 1 endpoint: `POST` to `${base_url}/automate`.
- Every request requires an `api_key` parameter in the querystring.


### Request:
The `POST` to `/automate` takes in 3 parameters in a `JSON` body. `action`, `type`, and `payload`.

- `action` can be either `"validate"` or `"submit"`. If it is `validate`, the bill payment only gets as far as the final screen, at which point the process exits. If it is `submit`, the payment is fully submitted.
- `type` sets which billing service will be paid. Valid values for this are in the examples below.
- `payload` is an object that contains the information necessary to submit the payment. The fields in this object vary between different bill payment types, but they all have some combination of these fields: `file`, `payment`, `consumer`, and `checking_account`. Examples are later in this doc.

### Response:
The API response looks like this:
```
{
  "success": true,
  "response": {
    "session_id": "2020-03-06/b48af562-1eac-4413-a9ac-379d683c00cd",
    "err": {
        "name": "TIMEDOUT"
    },
    "pdf": "BASE_64_ENCODED PDF DATA",
    "action": "validate"
  }
}
```
- `session_id` is a unique path that can be used for debugging. It is the path of where screenshots are stored.
- `err` is undefined unless the process fails. In that case, it is an object with a `name` property.
- `pdf` is a Base64 encoded buffer holding a PDF of the final screen that the headless browser reached.
- `action` is the action value that was passed into the request.

### Sample CURL:
```
curl --request POST \
  --url 'https://hxvyxinxh6.execute-api.us-east-1.amazonaws.com/live/api/v1/automate?api_key=xxxxx' \
  --header 'content-type: application/json' \
  --data '{
	"action": "validate",
	"type": "selip",
	"payload": {
		"file": {
			"number": "XXX",
			"ssn": "123456789",
			"phone": "2017873293",
			"last_name": "Test",
			"first_name": "Tester",
			"street": "15 Tester Pl",
			"city": "Montvale",
			"state": "NJ",
			"zip": "07458"
		},
		"payment": {
			"first_name": "Test",
			"last_name": "McTester",
			"street": "4 Concord Ct",
			"city": "Montvale",
			"state": "NJ",
			"zip": "07645",
			"email": "test.tester@test.com",
			"bank_name": "Test Bank",
			"routing_number": "0000000",
			"account_number": "1111111",
			"amount": "1",
			"date": "03/25/2020",
			"account_type": "savings"
		}
	}
}'
```

### Sample Request Bodies:

#### Tenaglia & Hunt:

```
{
	"action": "validate",
	"type": "tenaglia_hunt",
	"payload": {
		"file": {
			"number": "XXXX",
			"ssn": "1234"
		},
		"payment": {
			"amount": "1"
		},
		"checking_account": {
			"type": "personal",
			"routing_number": "XXXX",
			"account_number": "YYYY",
			"account_type": "checking"
		}
	}
}
```

#### Stenger & Stenger:
```
{
	"action": "validate",
	"type": "stenger_stenger",
	"payload": {
		"file": {
			"number": "XXXX",
			"ssn": "1234"
		},
		"payment": {
			"amount": "1",
			"date": "04/02/2020"
		},
		"checking_account": {
			"type": "personal",
			"routing_number": "XXXX",
			"account_number": "XXXX",
			"account_type": "checking"
		}
	}
}
```

#### Machol & Johannes:

```
{
	"action": "validate",
	"type": "machol_johannes",
	"payload": {
		"file": {
			"number": "",
			"ssn": "1234"
		},
		"payment": {
			"amount": "1"
		},
		"checking_account": {
			"holders_name": "Test Tester",
			"routing_number": "50891291",
			"account_number": "50891291"
		},
		"consumer": {
			"first_name": "Test",
			"last_name": "Tester",
			"address_1": "9 Bargo Rd",
			"address_2": "Apt 7",
			"city": "Metfield",
			"state": "NJ",
			"zip": "07481",
			"phone": "2017873299"
		}
	}
}
```

#### Hood & Stacy:

```
{
	"action": "validate",
	"type": "hood_stacy",
	"payload": {
		"file": {
			"number": "XXXX",
			"last_name": "YYYY",
			"zip": "07458"
		},
		"payment": {
			"amount": "1"
		},
		"checking_account": {
			"holders_name": "Test Tester",
			"type": "personal",
			"routing_number": "XXXXXX",
			"account_number": "XXXXXX",
			"check_number": "4"
		},
		"consumer": {
			"first_name": "Test",
			"middle_initial": "C",
			"last_name": "Tester",
			"address_1": "9 Bargo Rd",
			"address_2": "Apt 7",
			"city": "Metfield",
			"state": "NJ",
			"zip": "07481",
			"phone": "2017873299",
			"email": "test@tester.com"
		}
	}
}
```

#### Glasser & Glasser:

```
{
	"action": "validate",
	"type": "glasser_glasser",
	"payload": {
		"file": {
			"number": "XXXXXX",
			"ssn": "1234"
		},
		"payment": {
			"amount": "1"
		},
		"checking_account": {
			"routing_number": "XXXXXX",
			"account_number": "XXXXXX"
		},
		"consumer": {
			"first_name": "Test",
			"last_name": "Tester",
			"address_1": "9 Bargo Rd",
			"address_2": "Apt 7",
			"city": "Metfield",
			"state": "NJ",
			"zip": "07481",
			"phone": "2017873299"
		}
	}
}
```

#### Nelson & Kennard:
```
{
	"action": "validate",
	"type": "nelson_kennard",
	"payload": {
		"file": {
			"number": "XXXXXX",
			"last_name": "YYYY",
			"zip": "07458"
		},
		"payment": {
			"amount": "1",
			"date": "04/30/2020"
		},
		"checking_account": {
			"holders_name": "Mitch Tester",
			"type": "personal",
			"routing_number": "XXXXXX",
			"account_number": "XXXXXX",
			"check_number": "3"
		},
		"consumer": {
			"first_name": "Test",
			"middle_initial": "C",
			"last_name": "Tester",
			"address_1": "9 Bargo Rd",
			"address_2": "Apt 7",
			"city": "Metfield",
			"state": "NJ",
			"zip": "07481",
			"phone": "2017873299",
			"email": "test@tester.com"
		}
	}
}
```

#### Couch & Conville:
```
{
	"action": "validate",
	"type": "couch_conville",
	"payload": {
		"file": {
			"number": "XXXXXX",
			"last_name": "YYYY",
			"ssn": "1234"
		},
		"payment": {
			"amount": "1"
		},
		"checking_account": {
			"holders_name": "Mitch Tester",
			"type": "personal",
			"routing_number": "XXXXXX",
			"account_number": "XXXXXX",
			"check_number": "3"
		},
		"consumer": {
			"first_name": "Test",
			"middle_initial": "C",
			"last_name": "Tester",
			"address_1": "9 Bargo Rd",
			"address_2": "Apt 7",
			"city": "Metfield",
			"state": "NJ",
			"zip": "07481",
			"phone": "2017873299",
			"email": "test@tester.com"
		}
	}
}
```

#### Moore Law Group:

```
{
	"action": "validate",
	"type": "moore_law",
	"payload": {
		"file": {
			"number": "XXXXXX",
			"zip": "07458"
		},
		"payment": {
			"amount": "1",
			"date": "04/23/2020"
		},
		"checking_account": {
			"routing_number": "XXXXXX",
			"account_number": "XXXXXX"
		},
		"consumer": {
			"first_name": "Test",
			"last_name": "Tester",
			"address_1": "9 Bargo Rd",
			"address_2": "Apt 7",
			"city": "Metfield",
			"state": "NJ",
			"zip": "07481"
		}
	}
}
```

#### RAS Lavrar LLC:

```
{
	"action": "validate",
	"type": "ras_lavrar",
	"payload": {
		"file": {
			"number": "XXXXXX",
			"zip": "07458"
		},
		"payment": {
			"amount": "1",
			"date": "04/23/2020"
		}
	}
}
```

#### Merrerli & Kramer:

```
{
	"action": "validate",
	"type": "messerli_kramer",
	"payload": {
		"file": {
			"number": "XXXXXX",
			"last_name": "YYYYY",
			"ssn": "1234"
		},
		"payment": {
			"amount": "1"
		},
		"checking_account": {
			"holders_name": "Test Tester",
			"type": "personal",
			"routing_number": "XXXXXX",
			"account_number": "XXXXXX",
			"check_number": "5"
		},
		"consumer": {
			"first_name": "Test",
			"middle_initial": "C",
			"last_name": "Tester",
			"address_1": "9 Bargo Rd",
			"address_2": "Apt 7",
			"city": "Metfield",
			"state": "NJ",
			"zip": "07481"
		}
	}
}
```

#### Lyons & Doughty:

```
{
	"action": "validate",
	"type": "lyons_doughty",
	"payload": {
		"file": {
			"number": "XXXXXX",
			"ssn": "1234"
		},
		"payment": {
			"amount": "1"
		},
		"checking_account": {
			"holders_name": "Test Tester",
			"type": "personal",
			"routing_number": "XXXXXX",
			"account_number": "XXXXXX",
			"check_number": "5"
		}
	}
}
```

#### Javitch & Block:

```
{
	"action": "validate",
	"type": "javitch_block",
	"payload": {
		"file": {
			"number": "XXXXXX",
			"ssn": "1234"
		},
		"payment": {
			"amount": "1"
		}
	}
}
```

#### Suttell & Hammer:

```
{
	"action": "validate",
	"type": "suttell_hammer",
	"payload": {
		"file": {
			"number": "XXXXXX",
			"ssn": "1234"
		},
		"payment": {
			"amount": "1",
			"date": "04/04/2020"
		}
	}
}
```

#### Scott Associates:

```
{
	"action": "validate",
	"type": "scott_associates",
	"payload": {
		"file": {
			"number": "XXXXXX",
			"ssn": "1234",
			"last_name": "YYYY"
		},
		"payment": {
			"amount": "1"
		},
		"checking_account": {
			"holders_name": "Test Tester",
			"type": "personal",
			"routing_number": "XXXXXX",
			"account_number": "XXXXXX",
			"account_type": "checking"
		}
	}
}
```

#### Weltman & Weinberg:

```
{
	"action": "validate",
	"type": "weltman_weinberg",
	"payload": {
		"file": {
			"number": "XXXXXX",
			"ssn": "1234"
		},
		"payment": {
			"amount": "25"
		},
		"checking_account": {
			"holders_name": "Test Tester",
			"routing_number": "XXXXXX",
			"account_number": "XXXXXX",
			"check_number": "5"
		}
	}
}
```

#### Blitt:

```
{
	"action": "validate",
	"type": "blitt",
	"payload": {
		"file": {
			"number": "XXXXXX",
			"ssn": "123456789",
			"last_name": "Test",
			"first_name": "Tester",
			"zip": "07458"
		},
		"payment": {
			"amount": "1",
			"date": "04/25/2020"
		},
		"consumer": {
			"first_name": "Test",
			"middle_initial": "C",
			"last_name": "Tester",
			"address_1": "9 Bargo Rd",
			"address_2": "Apt 7",
			"city": "Metfield",
			"state": "NJ",
			"zip": "07481",
			"phone": "2017873254",
			"email": "test.tester@gmail.com"
		},
		"checking_account": {
			"holders_name": "Test Tester",
			"type": "personal",
			"routing_number": "XXXXXX",
			"account_number": "XXXXXX",
			"check_number": "5"
		}
	}
}
```

#### Selip:

```
{
	"action": "validate",
	"type": "selip",
	"payload": {
		"file": {
			"number": "N429738",
			"ssn": "XXXXXX",
			"phone": "2017873294",
			"last_name": "Test",
			"first_name": "Test",
			"street": "15 Test",
			"city": "Test",
			"state": "NY",
			"zip": "07458"
		},
		"payment": {
			"first_name": "Test",
			"last_name": "McTester",
			"street": "4 Concord Ct",
			"city": "Montvale",
			"state": "NJ",
			"zip": "07645",
			"email": "test.tester@test.com",
			"bank_name": "Test Bank",
			"routing_number": "0000000",
			"account_number": "1111111",
			"amount": "1",
			"date": "03/25/2020",
			"account_type": "savings"
		}
	}
}
```


