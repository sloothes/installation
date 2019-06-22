//  installation-demo.js.

(async function(){

//  OUTFIT URLS.

    var skinned = {};

    skinned.male = [
        "/skinned/male/body.json",
        "/skinned/male/eyes.json",
        "/skinned/male/hairs.json",
        "/skinned/male/underwears.json",
        "/skinned/male/costume.json",
        "/skinned/male/trousers.json",
        "/skinned/male/shoes.json",
    ];

    skinned.female = [
        "/skinned/female/body.json",
        "/skinned/female/eyes.json",
        "/skinned/female/hairs.json",
        "/skinned/female/stockings.json",
        "/skinned/female/underwears.json",
        "/skinned/female/dress.json",
        "/skinned/female/costume.json",
        "/skinned/female/trousers.json",
        "/skinned/female/shoes.json",
    ];

    skinned.skeleton = [
        "/skinned/skeleton/bones.json",
        "/skinned/skeleton/skeleton.json",
    ];

//  ANIMATION URLS.

    var animations = {};

    animations.basic = [
        "/animations/basic/idle.json",
        "/animations/basic/walk.json",
        "/animations/basic/run.json",
        "/animations/basic/jump.json",
    ];

    animations.male = [
        "/animations/male/idle.json",
        "/animations/male/walk.json",
        "/animations/male/run.json",
        "/animations/male/jump.json",
    ];

    animations.female = [
        "/animations/female/idle.json",
        "/animations/female/walk.json",
        "/animations/female/run.json",
        "/animations/female/jump.json",
    ];

//  INSTALL MATERIALS TO INDEXED DB.

    async function installMaterials(url){

        var cache = await caches.open("materials")
        .then(async function(cache){ return cache; });

        await cache.add(url);

        var docs = await cache.match(url)
        .then(function(response){
            return response.json();
        }).then(function(json){
            return json;
        });

        debugMode && console.log({"(material) docs":docs});

        var collection = db.collection("materials");

        for (var i=0; i < docs.length; i++){

            var doc = docs[i];

            var result = await collection.findOne({_id:doc._id}, function(err){
                if (err) throw err;
            }).then(async function(result){ 
                return result; 
            });

            if (result) {

                var selector = {_id:doc._id};
                var modifier = {$set:doc};

                await collection.update(selector, modifier, function(err){
                    if (err) throw err;
                }).catch(function(err){
                    console.error(err);
                });

                debugMode && console.log("updated:", {[doc.name]:doc});

            } else {

                await collection.insert(doc, function(err){
                    if (err) throw err;
                }).catch(function(err){
                    console.error(err);
                });

                debugMode && console.log("inserted:", {[doc.name]:doc});

            }

        }

    }

//  INSTALL ANIMATIONS TO INDEXED DB.

    async function installAnimations(options){

        var cache = await caches.open(options.name)
        .then(async function(cache){
            return cache;
        });

        await cache.addAll( options.URLS );

        var doc = {_id:options._id}; // important!

        for (var i=0; i < options.URLS.length; i++){

            var json = await caches.match(options.URLS[i])
            .then(function(response){
                return response.json();
            }).then(function(json){
                return json;
            });

            doc[json.name] = json;

        }

        var modifier = {$set: doc};
        var selector = {_id: doc._id};
        var collection = db.collection(options.name);


        var result = await collection.findOne(selector, function(err){
            if (err) throw err;
        }).then(async function(result){ 
            return result; 
        });

        if (result) {

        //  debugMode && console.log({"found":result._id});

            await collection.update(selector, modifier, function(err){
                if (err) throw err;
            }).catch(function(err){
                console.error(err);
            });

            debugMode && console.log("updated:", {[doc._id]:doc});

        } else {

            await collection.insert(doc, function(err){
                if (err) throw err;
            }).catch(function(err){
                console.error(err);
            });

            debugMode && console.log("inserted:", {[doc._id]:doc});

        }

    }

//  loadSkinnedMesh.js

    async function loadSkinnedMesh(json){

        var loader = new THREE.JSONLoader();
        var geometry = loader.parse( json ).geometry;

        geometry.sourceFile = json.sourceFile;  // important!

        geometry.computeFaceNormals();
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        geometry.name = json.name + ".geometry";

        var material = new THREE.MeshStandardMaterial({skinning:true});

        var skinned = new THREE.SkinnedMesh( geometry, material );

        skinned.renderDepth = 1;
        skinned.frustumCulled = false;
        skinned.position.set( 0, 0, 0 );
        skinned.rotation.set( 0, 0, 0 );
        skinned.castShadow = true;
        skinned.name = json.name;

        return skinned;
    }

//  INSTALL OUTFITS TO INDEXED DB.

    async function createOutfit(options){

        var cache = await caches.open(options.name)
        .then(async function(cache){ return cache; });

        await cache.addAll( options.URLS );

        var outfit = new AW3D.OutfitManager(); // important!
        var collection = db.collection(options.name);

        for (var i=0; i < options.URLS.length; i++){ 
            await (async function(){
                var url = options.URLS[i];
                await cache.match(url).then(function(response){
                    return response;
                }).then(async function(response){
                    return response.json();
                }).then(async function(json){
                    json.sourceFile = url; // very important!
                    var key = json.name;
                    outfit[key] = await loadSkinnedMesh(json);
                    return outfit[key];
                }).then(function(mesh){
                    console.log(mesh);
                });
            })();
        }

        return outfit;

    }


//  Insert outfits in indexedDB.

    async function insertOutfits( outfit ){

        var slots = ["body", "eyes", "hairs", "stockings", "underwears", "dress", "costume", "tshirt", "trousers", "shoes"];

        for (var i = 0; i < slots.length; i++){

            (async function(){

                var slot = slots[i];

                if ( slot in outfit ) {

                    var object = outfit.toJSON(slot);
                    object[slot]._id = object[slot].name; // important! danger!

                    var modifier = { $set: object[ slot ] };
                    var selector = { _id:  object[ slot ]._id };
                    var collection = db.collection(options.name);

                    var result = await collection.findOne(selector, function(err){
                        if (err) throw err;
                    }).then(async function(result){ 
                        return result; 
                    });

                    if (result) {

                        await collection.update(selector, modifier, function(err){
                            if (err) throw err;
                        }).catch(function(err){
                            console.error(err);
                        });

                        debugMode && console.log("updated:", object);

                    } else {

                        await collection.insert(object[slot], function(err){
                            if (err) throw err;
                        }).catch(function(err){
                            console.error(err);
                        });

                        debugMode && console.log("inderted:", object);

                    }

                }

            })();

        }

    }
