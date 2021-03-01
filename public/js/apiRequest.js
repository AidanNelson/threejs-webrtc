// wikipedia API example code from https://codesnippet.io/wikipedia-api-tutorial/
function addElementsToScene(scene, query) {
  var xhr = new XMLHttpRequest();
  var url = `https://en.wikipedia.org/w/api.php?action=query&origin=*&format=json&generator=search&gsrnamespace=0&gsrlimit=35&gsrsearch='${query}'`;

  // Open a new connection, using the GET request on the URL endpoint
  // Providing 3 arguments (GET/POST, The URL, Async True/False)
  xhr.open("GET", url, true);
  // Once request has loaded...
  xhr.onload = function () {
    // Parse the request into JSON
    var data = JSON.parse(this.response);

    // Log the data object
    // console.log(data);

    // Log the page objects
    // console.log(data.query.pages);

    // Loop through the data object
    // Pulling out the titles of each page
    for (var i in data.query.pages) {
      let title = data.query.pages[i].title.replace(/[\s]/g, "_"); // Replace whitespaces with underscores
      let link = "https://en.wikipedia.org/wiki/" + title;
      addLinkElement(scene, link);
    }
  };

  // Send request to the server
  xhr.send();
}

function addLinkElement(scene, link){
    let linkGeometry = new THREE.SphereGeometry(1,12,12);
    let linkMaterial = new THREE.MeshPhongMaterial({color: 'red'});
    let linkMesh = new THREE.Mesh(linkGeometry, linkMaterial);

    linkMesh.userData.interactable = true;
    linkMesh.userData.link = link;
    console.log('link:',link);

    scene.add(linkMesh);
    linkMesh.position.set((Math.random() -0.5 )* 50, 2, (Math.random() -0.5 ) * 50);
}