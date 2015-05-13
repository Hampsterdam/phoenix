angular.module('phoenix.controllers', [])

.controller("LoginCtrl", function($scope, $window, AuthFactory){
	$scope.email = "";
    $scope.password = "";

    $scope.login = function() {
        var response = AuthFactory.login($scope.email, $scope.password);
        if (response.token) {
            $window.sessionStorage.token = response.token;
        } else {
            delete $window.sessionStorage.token;
            $scope.loginError = true;
        }
    }

    $scope.isError = function() {
        if ($scope.loginError) {
            return true;
        }
        return false;
    }


})

.controller("SignUpCtrl", function($scope, $window, AuthFactory) {
    $scope.email = "";
    $scope.password = "";
    $scope.firstname = "firstname";
    $scope.lastname = "lastname";
    $scope.signinError = false;

    $scope.signup = function() {
        var response = AuthFactory.login($scope.email, $scope.password, $scope.firstname, $scope.lastname)
        if (resonse.token) {
            $window.sessionStorage.token = response.token;
        } else {
            delete $window.sessionStorage.token;
            $scope.signinError = true;
        }
    };

    $scope.isError = function() {
        if ($scope.signinError) {
            return true;
        }
        return false;
    }

})

.controller('ExploreCtrl', function($scope, $cordovaGeolocation, MediaFactory, Helpers, Socket) {

    var your_api_code = 'pk.eyJ1IjoiY2h1a2t3YWdvbiIsImEiOiJOajZaZTdjIn0.Qz8PSl6vP1aBB20ni7oyGg';
    
    L.mapbox.accessToken = your_api_code;
    var map = L.mapbox.map('map', 'mapbox.streets').setView([30.3077609, -97.7534014], 12);
    
    var posOptions = {timeout: 10000, enableHighAccuracy: false};
    $cordovaGeolocation
      .getCurrentPosition(posOptions)
      .then(function (position) {
         var lat = position.coords.latitude;
         var lon = position.coords.longitude;

         map.panTo(new L.LatLng(lat, lon));
      })
    var mediaFactory = MediaFactory.getAllMedia()
    mediaFactory.then(function(data){
        Helpers.populateMap(data.data, map);
    })
    Socket.on('mediaInsert', function(data) {
      Helpers.populateMap([data], map);
    })


 })

.controller('ProfileCtrl', function($scope) {

})

.controller('AddMediaCtrl', function($scope, $cordovaCamera, $cordovaFile, $cordovaFileTransfer, MediaFactory) {
  document.addEventListener('deviceready', function(){
    $scope.images = [];
      
    $scope.addImage = function() {
      var options = {
        quality: 25,
        destinationType : Camera.DestinationType.FILE_URI,
        sourceType : Camera.PictureSourceType.CAMERA, // Camera.PictureSourceType.PHOTOLIBRARY
        allowEdit : false,
        encodingType: Camera.EncodingType.JPEG,
        popoverOptions: CameraPopoverOptions,
        saveToPhotoAlbum: true
      };

      $cordovaCamera.getPicture(options).then(function(imageData) {
        var options = {}
        $cordovaFileTransfer.upload('http://phoenixapi.herokuapp.com/api/media/upload', imageData, options)
          .then(function(data){
            alert("image uploaded");
            var mediaFactory = MediaFactory.addMedia(data, 'image', '30.56', '-97.45', '1', 'ATX', '125')
            mediaFactory.then(function(response){
              alert('saved to database!');
            })
          }, function(err){
            alert('upload error:', err);
          }, false)
      }, function(err) {
        console.log(err);
      });
    }
    
  }) 
})

