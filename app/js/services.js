'use strict';

/* Services */
angular.module('myApp.services', [])
//provide methods to manage credentials of federated user 
.factory('loggerManager', function(configLogger, $location, $rootScope){
	var baseFactory = {
		handler: new AWS.STS(),
		provider: false,
		credentials: {},
		id: false
	};
	
	/**
	 * logout method (based on ID provider)
	 */
	baseFactory.logout = function() {
		if(baseFacory.provider == "amazon") {			
			amazon.Login.Logout();
		}
	};
	
/**
 * login method (based on provider)
 * @param provider the  name of provider
 * @param data data used for the login
 * @param redirect the destination after login
 */
baseFactory.login = function(provider, data, redirect) {
	
	//get the access params from AWS with the amazon login
if(provider == "amazon") {			

	AWS.config.credentials = new AWS.WebIdentityCredentials({
		  RoleArn: configLogger.amazonRoleArn,
		  ProviderId: 'www.amazon.com', // this is null for Google
		  WebIdentityToken: data.access_token
		});
	
	//assume role from AWS
	baseFactory.handler.assumeRoleWithWebIdentity({
		RoleArn: configLogger.amazonRoleArn,
		RoleSessionName: configLogger.amazonRoleName,
		WebIdentityToken: data.access_token,
		ProviderId: "www.amazon.com"
	}, function(err, data){
		//login ok
			if(data && data.Credentials) {
				baseFactory.provider = provider;
				baseFactory.credentials = data.Credentials;
				baseFactory.id = data.SubjectFromWebIdentityToken;
				 if(redirect) {
				     $location.path(redirect);
				     $rootScope.$apply();
				 }
			}
		});
	
	}
};
	
	/**
	 * return the access key provided by amazon, google, fb...
	 */ 
	baseFactory.getAccessKeyId = function() {
		if(baseFactory.credentials.AccessKeyId) {
			return baseFactory.credentials.AccessKeyId;
		}
		else {
			return "";
		}
	};

	/**
	 * return the id provided by amazon, google, fb...
	 */  
	baseFactory.getSecretAccessKey = function() {
		if(baseFactory.credentials.SecretAccessKey) {
			return baseFactory.credentials.SecretAccessKey;
		}
		else {
			return "";
		}
	};
	

	/**
	 * return the user id
	 */ 
	baseFactory.getUserId = function() {
		if(baseFactory.id) {
			return baseFactory.id;
		}
		else {
			return "";
		}
	};
	
	return baseFactory;
})
// provides methods to put and get file on S3
.factory('s3Ng', function(configAWS, loggerManager){
	var baseFactory = { 
		handler:false
	};
	/**
	 * start the service
	 */
	baseFactory.build = function() {
		baseFactory.handler =  new AWS.S3({params: {Bucket: configAWS.bucketName}});
	};
	
	/**
	 * put file on the cloud storage
	 * @param fileName
	 * @param fileBody
	 */
	baseFactory.put = function(fileName, fileBody) {
		 var params = {Key: loggerManager.provider + "/" + loggerManager.getUserId() + "/" + fileName, Body: fileBody};
		 baseFactory.handler.putObject(params, function (err, data) {
			console.log(data);
		 });

	};
	return baseFactory;
	
})
/** 
 * factory to manage data on a specific table on DynamoD
 * 
 */
.factory('dynamoFinanceTable', function(loggerManager) {
	var baseFactory = {};

	/** 
	 * build and return the json conditions for the dynamo query
	 */ 
	baseFactory.getConditions = function(from, to) {
		var keyConditions = {
				"userId": {ComparisonOperator: "EQ", AttributeValueList:[{"S":loggerManager.getUserId()}]},
				"date": {ComparisonOperator: "BETWEEN", AttributeValueList:[{"S": from.toString()}, {"S": to.toString()}]},
		 };
		return keyConditions;
	};
	
	//base model for finance element
	baseFactory.modelAmount = function(data) {
		var model = {
			userId:{"S": loggerManager.getUserId()},
		  	amount:{"N": "0"},
		  	confirmed: {"S": "no"},
		  	date: {"S": ""},
		  	recurrent: {"S": ""},
		  	tag: {"S": ""},
		  	type: {"S": ""}
		};
		
		//if data, set the values where correct
		if(data.amount) {
			model.amount.N = data.amount;
		}
		if(data.type == "expense" ) {
			model.amount.N *= -1;
		}
		if(data.tag) {
			model.tag.S = data.tag;
		}
		if(data.type) {
			model.type.S = data.type;
		}
		if(data.confirmed) {
			model.confirmed.S = data.confirmed;
		}
		if(data.recurrent) {
			model.recurrent.S = data.recurrent;
		}
		if(data.date) {
			model.date.S = data.date;
		}
		model.amount.N = model.amount.N.toString();
		return model;
	};
	
	return baseFactory;
})
.factory('dynamoNg', function (configAWS, loggerManager) {
	// Enable pusher logging - don't include this in production
	var baseFactory = { 
		handler:false
	};

	//start the app
	baseFactory.build = function() {
		//new pusher with config
		//baseFactory.handler =  new AWS.DynamoDB({region: configAWS.region, accessKeyId: loggerManager.getAccessKeyId(), secretAccessKey: loggerManager.getSecretAccessKey()});
		baseFactory.handler =  new AWS.DynamoDB({region: configAWS.region});
		
	};
	
	
	/**
	 * put an element in to dynamo table. Data is a formatted json for dynamo
	 * @param table name
	 * @param data are the data in JSON formatted for DynamoDB
	 * @return the result of the query
	 */ 
	baseFactory.put = function(table, data) {
		return baseFactory.handler.putItem({
			TableName: table,
			Item: data
		});
	};
	
	/**
	 * Get an element from a DynamoDB table
	 * @param table name
	 * @param data the key to fetch
	 * @return elements by the table
	 */
	baseFactory.get = function(table, data) {
		return baseFactory.handler.getItem({
			TableName: table,
			Key: data
		});
	};
	
	/**
	 * makes a query
	 * @param query
	 * @returns query result
	 */
	baseFactory.query = function(query) {
		return baseFactory.handler.query(query);
	};

	/**
	 * makes a scan
	 * @param query
	 * @returns query result
	 */
	baseFactory.scan = function(query) {
		return baseFactory.handler.scan(query);
	};
	

	/**
	 * parse the dynamo data
	 * @param the data
	 * @returns the data extracted
	 */
	baseFactory.reverseModel = function(response) {
		var result = [];
		if(response.data.Count) {
			for(var ii in response.data.Items) {
				var item = response.data.Items[ii];
				result[ii] = {};
				for(var kk in item) {
			
					if(item[kk].S) {
						result[ii][kk] = item[kk].S;
					}
					if(item[kk].N) {
						result[ii][kk] = item[kk].N;
					}
					//binary type is missing!
				}
			}
		}
		return result;
		
	};
	return baseFactory;
})
;

