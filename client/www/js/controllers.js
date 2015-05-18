angular.module('axil.controllers', [])



.controller("LoginCtrl", function($scope, $state, $rootScope, $ionicModal, $window, AuthFactory, TokenFactory){

   $scope.loginInfo = {};
   $rootScope.authenticated = false;

   // Primary Login Method, uses Auth Factory to send login request to the API
   $scope.login = function() {
      AuthFactory.login($scope.loginInfo.email, $scope.loginInfo.password)
      .then(function(response){
        // The response will contain a json web token if the login was successful
        if (response.data.token) {
            TokenFactory.deleteToken();
            TokenFactory.setToken(response.data);
            $rootScope.authenticated = true;
            $state.go('tab.explore')
        } else {
            $scope.loginError = true;
            TokenFactory.deleteToken();
        }
      })
    }

     // Helper function to keep track of login status
    $scope.isError = function() {
        if ($scope.loginError) {
            return true;
        }
        return false;
    }
    // Simple logout... delete the token on the client side
    // TODO - delete the server side token as well
    $scope.logout = function() {
      TokenFactory.deleteToken();
      $rootScope.authenticated = false;
      $state.go('/login');
    }

    // If the user wants to sign up, redirect to the signup view
    $scope.signupRedirect = function() {
      $state.go('/signup');
    }

})

.controller("SignupCtrl", function($scope, $rootScope, $state, AuthFactory, TokenFactory, $window) {
    $scope.signupInfo = {};
    $scope.signinError = false;
    $rootScope.authenticated = false;

    // Main Signup Method, uses the AuthFactory to create a new user and log the user in with a new session token.
    $scope.signup = function() {
      AuthFactory.signup($scope.signupInfo.firstname, $scope.signupInfo.lastname, $scope.signupInfo.email, $scope.signupInfo.password)
        .then(function(response) {
          if (response.data.token) {
              TokenFactory.setToken(response.data);
              $rootScope.authenticated = true;
              $state.go("tab.explore");
          } else {
              TokenFactory.deleteToken();
              $scope.signinError = true;
          }
        });
    };

    // Auth Helper Function, not yet in use
    $scope.isError = function() {
        if ($scope.signinError) {
            return true;
        }
        return false;
    }

    // Simple state redirect to login
    $scope.loginRedirect = function() {
      $state.go('/login');
    }

})

// Controller for the Explore Page
// Functions: Load the Explore map, retrieve media data from the API, cluster data by location and filter by time (TODO)
.controller('ExploreCtrl', function($scope, $cordovaGeolocation, $ionicPlatform, $ionicModal, MediaFactory, MapFactory, Socket) {
  // Wrapper function that listens for when the state is ready

  $ionicPlatform.ready(function() {
    $scope.markerInfo = "";
    //CLUSTER MODAL
    var mapListModal = $ionicModal.fromTemplateUrl('map-list-modal.html', {
      scope: $scope,
      animation: 'slide-in-up'
    })
    mapListModal.then(function(modal){
      $scope.listModal = modal;
    })

    $scope.openListModal = function(){
      $scope.listModal.show();
    }

    $scope.closeListModal = function(){
      $scope.listModal.hide();
    }

    $scope.$on('$destroy', function(){
      $scope.listModal.remove();
    })

    //MARKER MODAL
    var markerModal = $ionicModal.fromTemplateUrl('marker-modal.html', {
      scope: $scope,
      animation: 'slide-in-up'
    })

    markerModal.then(function(modal){
      $scope.markerModal = modal;
    })

    $scope.openMarkerModal = function(){
      $scope.markerModal.show();
    }

    $scope.closeMarkerModal = function(){
      $scope.markerModal.hide();
    }

    $scope.$on('$destroy', function(){
      $scope.markerModal.remove();
    })


    var your_api_code = 'pk.eyJ1IjoiY2h1a2t3YWdvbiIsImEiOiJOajZaZTdjIn0.Qz8PSl6vP1aBB20ni7oyGg';

    // Load the Default Map
    L.mapbox.accessToken = your_api_code;
    var map = L.mapbox.map('map', 'mapbox.streets').setView([30.2698848, -97.7444182], 16);
    var clusters = new L.MarkerClusterGroup({
      // The iconCreateFunction takes the cluster as an argument and returns
      // an icon that represents it. We use L.mapbox.marker.icon in this
      // example, but you could also use L.icon or L.divIcon.
      iconCreateFunction: function(cluster) {
        return L.mapbox.marker.icon({
          // show the number of markers in the cluster on the icon.
          'marker-symbol': cluster.getChildCount(),
          'marker-color': '#ff8888',
          'marker-size': 'large'
        });
      }
    });


    clusters.on('clusterclick', function(a){
      // $scope.medias = a.layer._markers;
      // console.log('medias', $scope.medias);
      // $scope.openListModal();
    })

    // Center the map on a selected marker
    clusters.on('click', function(e) {
      map.panTo(e.layer.getLatLng());
      $scope.markerInfo = e.layer.options.icon.options;
      console.log('marker clicked', $scope.markerInfo);
      $scope.openMarkerModal();
    });

    // Add the user marker to the map
    var user = new L.mapbox.featureLayer().addTo(map);

    // Get the user position and move the map to their location;
    var posOptions = { timeout: 30000, enableHighAccuracy: true };
    $cordovaGeolocation
      .getCurrentPosition(posOptions)
      .then(function(position){
         MapFactory.userMarker(position.coords, user);
      }, function(err){

      })

    // Keep track of the user as they move (while the application is running, no background tracking)
    var watchOptions = { maximumAge: 3000, timeout: 30000, enableHighAccuracy: false };
    $cordovaGeolocation
      .watchPosition(watchOptions)
      .then(null, function(err) {
        // geolocation down, no worries
      }, function(position){
        // Set a marker at the user's location
         map.panTo(new L.LatLng(position.coords.latitude, position.coords.longitude));
         MapFactory.updateUserPosition(position.coords);
      });

    // Fetch the media from the API
    MediaFactory.getAllMedia()
      .then(function(data){
        //Get media data from server for listview modal
        // Populate the map with media clusters
        MapFactory.populateMap(data.data, clusters, map);
    });

    // Socket connection listening for new media on the database
    Socket.on('mediaInsert', function(data) {
      MapFactory.populateMap([data], clusters, map);
    });


    // Center the map on the user when selected
    user.on('click', function(e) {
      map.panTo(e.layer.getLatLng());
    });
  });
 })

// Main controller for the Profile Page
// TODO: Fetch the logged in users info to load their profile and list their uploaded media (with associated data)
// Dynamically spin up profile views for other users if the logged in user wants to view someone else's profile.
.controller('ProfileCtrl', function($scope, UserFactory, MediaFactory, TokenFactory) {
  $scope.userInfo = {};
  $scope.userInfo.user_id = TokenFactory.getUserId();

  // Fetch the user's profile information from the database
  UserFactory.getUniqueUser($scope.userInfo.user_id)
  .then(function(data) {
    var user = data.data[0];
    // Assign the profile information to scope variables
    $scope.userInfo.firstname = user.firstname;
    $scope.userInfo.lastname = user.lastname;
    $scope.userInfo.email = user.email;
  });

  // Get the user's media from the database and store it in MediaList
  MediaFactory.getMediaByUser($scope.userInfo.user_id)
  .then(function(data) {
    $scope.userInfo.mediaList = data.data;
    console.log($scope.userInfo.mediaList);
  });


})

// Main Controller for the Add Media Tab ( the camera )
.controller('AddMediaCtrl', function($rootScope, $scope, $cordovaCamera, $cordovaCapture, $cordovaFile, $state, $cordovaFileTransfer, $cordovaGeolocation, $ionicPlatform, $ionicModal, MediaFactory, TokenFactory) {

  //Setting up the Upload Media Modal that will pop up after the user has taken a video/picture
  $ionicPlatform.ready(function() {

    $ionicModal.fromTemplateUrl('upload-media-modal.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal){
      $scope.modal = modal;
    })

    $scope.openModal = function(){
      $scope.modal.show();
    }

    $scope.closeModal = function(){
      $scope.modal.hide();
    }

    $scope.$on('$destroy', function(){
      $scope.modal.remove();
    })

    $scope.images = [];
    $scope.media = {};
    $rootScope.spinner = false; 
    
    //User info needed to associate the uploaded media with the logged in user
    $scope.userInfo = {};
    $scope.userInfo.user_id = TokenFactory.getUserId();
    
    // Upload info captured in the upload media modal (tab-camera.html)
    $scope.uploadInfo = {};
    $scope.uploadInfo.tags = "";
    

    // If the user opts to add an image, this method will be called
    $scope.addImage = function() {

      // Set the options for image upload to the server/cloudinary
      var options = {
        quality: 15,
        destinationType : Camera.DestinationType.FILE_URI,
        sourceType : Camera.PictureSourceType.CAMERA, // Camera.PictureSourceType.PHOTOLIBRARY
        allowEdit : false,
        encodingType: Camera.EncodingType.JPEG,
        popoverOptions: CameraPopoverOptions,
        saveToPhotoAlbum: true,
        correctOrientation: true
      };

      //Launch Camera
      $cordovaCamera.getPicture(options).then(function(imageData) {
        $rootScope.spinner = true;
        var options = {}
        //Upload request to phoenix api, then to cloudinary.
        $cordovaFileTransfer.upload('http://phoenixapi.herokuapp.com/api/media/upload', imageData, options)
          .then(function(data){
              //data is the image url returned from clodinary. Set the image thumbail
              $scope.media.thumb = JSON.parse(data.response).url.slice(0, -3) + 'jpg';
              // Open the uplaod media modal
              $scope.openModal();
              var posOptions = {timeout: 30000, enableHighAccuracy: true};
              //Get current position and save the url along with geo location to the database.
              $cordovaGeolocation.getCurrentPosition(posOptions)
              .then(function(position) {
                // Redirect to the Exlore Page
                $state.go('tab.explore');
                var lat = position.coords.latitude;
                var lon = position.coords.longitude;
                // Upload the media with tags to the database, socket connection will populate the map when the media is successfully uploaded
                var mediaFactory = MediaFactory.addMedia(data, 'image', lat, lon, $scope.userInfo.user_id, 'ATX', 0)
                mediaFactory.then(function(response){
                  $rootScope.spinner = false;
                })
              })
          }, function(err){
          }, false)
      }, function(err) {
        console.log(err);
      });
  }

  // If the user opts to add a video, this method will be called
  $scope.addVideo = function(){
    // Set the time limit for the video and limit the number of videos per upload (no iOS support)
    var options = { limit: 1, duration: 10 };

    // Launch the video-camera with the options that we've defined
    $cordovaCapture.captureVideo(options).then(function(videoData) {
      $rootScope.spinner = true;
      var options = {};
      // Success! Video data is here
      $cordovaFileTransfer.upload('http://phoenixapi.herokuapp.com/api/media/upload/video', videoData[0].fullPath, options)
      .then(function(data){
        // Set the thumbnail Image
        $scope.media.thumb = JSON.parse(data.response).url.slice(0, -3) + 'jpg';
        // Open the upload media modal
        $scope.openModal();
        var posOptions = {timeout: 30000, enableHighAccuracy: true};

        //Get current position and save the url along with geo location to the database.
        $cordovaGeolocation.getCurrentPosition(posOptions)
        .then(function(position){
          // Redirect to the explore page
          $state.go('tab.explore');
          var lat = position.coords.latitude;
          var lon = position.coords.longitude;
          // Upload the media with tags to the database, socket connection will populate the map when the media is successfully uploaded
          var mediaFactory = MediaFactory.addMedia(data, 'video', lat, lon, $scope.userInfo.user_id, 'ATX', 0);
          mediaFactory.then(function(response){
            $rootScope.spinner = false;
          })
        })
      })
    }, function(err) {
      // An error occurred. Show a message to the user
      console.log('video upload error:', err);
    });
  }
});
});
