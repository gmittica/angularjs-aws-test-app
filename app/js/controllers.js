'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
  .controller('HomeCtrl', function($scope, dynamoNg) {
	  
	  // login button for Amazon
	  document.getElementById('LoginWithAmazon').onclick = function() {
	    var options = { scope : 'profile' };
	    amazon.Login.authorize(options, '/dynamofinance/app/#/logged/amazon');
	    return false;
	  };
  })
  
  .controller('LoginCtrl', function($scope, dynamoNg, $routeParams, loggerManager) {
	  //amazon login
	  if($routeParams.access_token) {
		  //do the login with the provider got by the url
		  loggerManager.login($routeParams.provider, $routeParams, "/finance/list");
	  };
	  
	  
  })
   .controller('LogoutCtrl', function($scope, dynamoNg, $routeParams, loggerManager) {
	   loggerManager.logout();
  })
  
  .controller("FinanceCtrl", function($scope, $routeParams, dynamoNg, dynamoFinanceTable, s3Ng, loggerManager, configLogger, configAWS){
	  //build dynamo manager
	  dynamoNg.build();
	  s3Ng.build();
	  
	  //base decalrations
	  $scope.movements = [];
	  $scope.symbol = "€"; //currency
	  $scope.today = new Date().getTime();
	  $scope.tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).getTime();
	  $scope.yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000).getTime();
	  $scope.month = new Date(new Date().getFullYear(), new Date().getMonth() +1 , 0).getTime();
	  
	  $scope.formReset = function(el) {
		$scope.form = el;
		$scope.enableUpload = el.date || null;
	  };
	  
	  //list of tags
	  $scope.expenseTags = {
		rent: "RENT",
		clothes: "clothes and accessories",
		car: "gasoline, insurance, maintance",
		expenditure: "food, home stuff",
		gadget: "books, techs, hobbies, stupid things",
		personal: "hairdresser, sport, spa",
		nightlife: "disco, restaurant, pub, cinema",
		health: "medicine, doctor",
		travel: "trips, holidays",
		gift: "presents",
		phone: "subscriptions, apps",
		tax: "and other damned expenses",
		gambling: "you should not do that!",
		work: "expenses that will be refunded, hopefully",
		other: ""
	  };
	  //list of tags
	  $scope.incomeTags = {
		salary: "regular salary",
		sale: "occasional sales",
		reward: "good job!",
		gambling: "really you won?",
		refund: "from work or tax",
		gitf: "are you getting pocket money yet!?",
		other: ""
	  };
	  
	  
	  //change action in the view and ctrl
	  $scope.setAction = function(act) {
		  $scope.action = act;			  
	  };
	  //change at first call (by the url param)
	  $scope.setAction($routeParams.action);
	  
	  $scope.amount = function(amount) {
		  if($scope.form.amount) {
			  $scope.form.amount = parseFloat($scope.form.amount) + amount;
		  }
		  else {
			  $scope.form.amount = amount;
		  }
	  };
	  
	  $scope.filterTag = function(tag) {
		  $scope.tag = tag;
	  };
	  $scope.filterType = function(type) {
		  $scope.type = type;
		  $scope.tag = '';
	  };
	  
	  //upload file
	  $scope.uploadFile = function() {
		  s3Ng.put("fileNameToSet", $scope.upload);
		  $scope.entryId = false;
	  };
	  
	  //store a movement in dynamo
	  $scope.add = function(el) {
		//prepare the data to store
		el.date = el.date.toString();
		var movement = dynamoFinanceTable.modelAmount(el);
		//store the data
		$scope.putMovement(movement);
		$scope.formReset(false);
	  };
	  

	  $scope.putMovement = function(movement) {
	  	dynamoNg.put(configAWS.tableName, movement)
	  	.on('success', function(response) {
			$scope.entryId = response.request.params.Item.date.S;
			$scope.$apply();
		 })
		 .on('error', function(error, response) { console.log(error); })
		.send();
	  };
	  
	  
	  if($scope.action == "new") {
		  
	  }
	  
	  //list of stored movements
	  if($scope.action == "list") {
		  //date filters
		  var from = $routeParams.from;
		  var to = $routeParams.to;
		  //if not set, filter by last 30 days
		  if(!from) {
			  from = new Date().getTime() - ((86400 * 30) * 1000);
			  to = new Date().getTime();
		  }
		  //get conditions
		  var keyConditions = dynamoFinanceTable.getConditions(from, to);
		  console.log(keyConditions);
		  
		  dynamoNg.query({
			  TableName: configAWS.tableName,
//			  IndexName: "date",
			  Select: "ALL_ATTRIBUTES",
			  KeyConditions: keyConditions
		  })
		  .on('success', function(response) {
			  $scope.movements = dynamoNg.reverseModel(response);
			  $scope.$apply();
		 })
		 .on('error', function(error, response) {
			  console.log("ERRORE"); console.log(error); })
		 .send();
	  
	  }
  })
;