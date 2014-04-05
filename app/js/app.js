'use strict';

angular.module('myApp', [
  'ngRoute',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',
  'myApp.controllers'
]).
config(['$routeProvider', '$provide', function($routeProvider, $provide) {
	$routeProvider.when('/home', {templateUrl: 'partials/home.html', controller: 'HomeCtrl'});
	$routeProvider.when('/finance/:action/:filter?', {templateUrl: 'partials/finance.html', controller: 'FinanceCtrl'});
	$routeProvider.when('/logged/:provider', {templateUrl: 'partials/home.html', controller: 'LoginCtrl'});
	$routeProvider.when('/logout', {templateUrl: 'partials/home.html', controller: 'LogoutCtrl'});
	$routeProvider.otherwise({redirectTo: '/home'});
}])
.constant('configAWS', {
	tableName: "your-dynamo-table-name",
	bucketName: "your-S3-bucket-name",
	region: "your-AWS-region-code"
})	
.constant('configLogger', {
	amazonAppId:'your-amazon-app-id',
	amazonRoleArn: 'your-AWS-role-ARN',
	amazonRoleName: "your-AWS-role-name",
});
