jQuery.fn.extend({
    getMaxZ: function () {
        return Math.max.apply(null, jQuery(this).map(function () {
            var z;
            return isNaN(z = parseInt(jQuery(this).css("z-index"), 10)) ? 0 : z;
        }));
    }
});
$(function () {
    var config = {
        apiKey: "AIzaSyBQDn0vPkxrLVXYyQ7skUjykW12NpZf7Pc",
        authDomain: "companylist-9afa1.firebaseapp.com",
        databaseURL: "https://companylist-9afa1.firebaseio.com",
        projectId: "companylist-9afa1",
        storageBucket: "companylist-9afa1.appspot.com",
        messagingSenderId: "820601125227"
    };
    firebase.initializeApp(config);

    var firebaseref = new firebase.database().ref();
    var listRef = null;
    var userData = null;
    var timer = null;
    var companyKey = null;
    var subKey = null;
    $(".status").removeClass('hide').hide();

    goToTab = function (tabname) {
        if (tabname == "#lists") {
            if (userData === null) tabname = "#login";
        }
        $(".nav.navbar-nav > li > a").parent().removeClass('active');
        $(".nav.navbar-nav > li > a[data-target='" + tabname + "']").parent().addClass('active');
        $(".tab").addClass('hide');
        $(".tab" + tabname).removeClass('hide');
    }

    var bindEventsToItems = function ($listItem) {
        $listItem.draggable({
            containment: "#sharedlist",
            start: function () {
                var topzindex = $("#sharedlist li").getMaxZ() + 1;
                $(this).css('z-index', topzindex);
            },
            stop: function () {
                addCSSStringToItem($(this).attr('data-item-id'), $(this).attr('style'));
            }

        }).css('position', 'absolute');

        $listItem.find(".removebtn").on('click', function () {
            removeItemFromFirebase($(this).closest("[data-item-id]").attr('data-item-id'));
        });

        $listItem.find(".editebtn").on('click', function () {
            var $earnings = $("#listitem1");
            var earnings = $earnings.val();
            $("#listitem1").val('');
            editeItemInFirebase($(this).closest("[data-item-id]").attr('data-item-id'), earnings);
        });

        $listItem.find(".addsubtn").on('click', function () {
            var $company = $("#listitem");
            var company = $company.val();
            var $earnings = $("#listitem1");
            var earnings = $earnings.val();
            if (earnings === "") {
                $("#lists .status").html('Please enter the text for the new item!').fadeIn(400);
                return;
            }
            $("#listitem").val('');
            $("#listitem1").val('');
            companyKey = $(this).closest("[data-item-id]").attr('data-item-id');
            addSubListItem(company, earnings);
        });

    }

    var buildNewListItem = function (listItem, key) {
        var company = listItem.company;
        var earnings = listItem.earnings;
        var sum = listItem.sum;
        var id = key;
        subKey = key;
        var css = listItem.css;
        if (sum === undefined || sum === earnings || sum === NaN) {
            var $newListItem = $("<li data-item-id='" + id + "'></li>").html("<p class='name'>" + company +
                "<span class='editebtn'><i class='fa fa-pencil'></i></span> " +
                "<span class='removebtn'><i class='fa fa-remove'></i></span> " +
                "<span class='addsubtn'><i class='fa fa-users'></i></span> " +
                "</span></p><p class='itemtext'>" + earnings + "</p>");
        } else {
            var $newListItem = $("<li data-item-id='" + id + "'></li>").html("<p class='name'>" + company +
                "<span class='editebtn'><i class='fa fa-pencil'></i></span> " +
                "<span class='removebtn'><i class='fa fa-remove'></i></span> " +
                "<span class='addsubtn'><i class='fa fa-users'></i></span> " +
                "</span></p><p class='itemtext'>" + earnings + "||" + sum + "K$" + "</p>");
        }

        $newListItem.prependTo($("#sharedlist"));
        $newListItem.attr('style', css);
        bindEventsToItems($newListItem);
    }

    var updateListItem = function (listItem, key) {
        var company = listItem.company;
        var earnings = listItem.earnings;
        var id = key;
        var css = listItem.css;
        var itemRef = firebase.database().ref('lists/sharedlist/items/' + key);
        var item = [];
        itemRef.on('value', function (snap) { item = snap.child('link').val() || [] });
        item.forEach(function (tempitem, i, item) {
            var inRef = firebase.database().ref('lists/sharedlist/items/' + tempitem);
            var inName;
            inRef.on('value', function (snap) {
                inName = snap.child('company').val();
                if (inName == undefined) {
                    item.splice(i, 1);
                }
            });
            itemRef.update({
                link: item
            })
        })
        $("#lists [data-item-id='" + id + "']").attr('itemtext', earnings);
        $("#lists [data-item-id='" + id + "']").attr('style', css);
    }

    var removeListItem = function (key) {
        $("#lists [data-item-id='" + key + "']").remove();
    }

    var editeListItem = function (listItem, key, earnings_c) {

        listItem.earnings = earnings_c;
    }

    var childAddedFunction = function (snapshot) {
        var key = snapshot.key;
        var listItem = snapshot.val();
        buildNewListItem(listItem, key);
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
            $("#lists .status").fadeOut(400);
        }, 2500);
        SummaryEarnings(key);
    }

    var childChangedFunction = function (snapshot) {
        var listItem = snapshot.val();
        var key = snapshot.key;
        console.log("Key - " + key + " has been changed");
        console.log(listItem);
        updateListItem(listItem, key);
        SummaryEarnings(key);
    }

    var childRemovedFunction = function (snapshot) {
        var key = snapshot.key;
        removeListItem(key)
        console.log('Child Removed');
        SummaryEarnings(key);
    }

    var setUpFirebaseEvents = function () {
        listRef = firebase.database().ref('lists/sharedlist/items');
        $("#sharedlist").html('');
        listRef.off('child_added', childAddedFunction)
        listRef.on("child_added", childAddedFunction);

        listRef.off('child_changed', childChangedFunction);
        listRef.on('child_changed', childChangedFunction);

        listRef.off('child_removed', childRemovedFunction);
        listRef.on('child_removed', childRemovedFunction);
    }


    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            console.log("User " + user.uid + " is logged in");
            userData = user;
            console.log(userData);
            loadProfile();
            setUpFirebaseEvents();
            goToTab("#lists");
        }
        else {
            console.log("User is logged out");
            userData = null;
            listRef = null;
        }
    });

    var loadProfile = function () {
        userRef = firebaseref.child('users').child(userData.uid);
        userRef.once('value', function (snap) {
            var temp = snap.val();
            if (!temp) {
                return;
            }
            var user = firebase.auth().currentUser;
            user.updateProfile({
                displayName: temp.full_name
            }).then(function () {
            }, function (error) {
            });
            goToTab("#lists");
        });
    }

    $("#addItemToList").on('click', function () {
        var $company = $("#listitem");
        var company = $company.val();
        var $earnings = $("#listitem1");
        var earnings = $earnings.val();
        if (earnings === "") {
            $("#lists .status").html('Please enter the text for the new item!').fadeIn(400);
            return;
        }
        $("#listitem").val('');
        $("#listitem1").val('');
        addListItem(company, earnings);
    });


    $(".nav.navbar-nav > li > a").on('click', function (e) {
        var id = $(this).attr('id');
        if (id == "logout") {
            return;
        }

        e.preventDefault();
        $(this).parent().addClass('active');
        if (userData !== null) {
            goToTab('#lists');
            return;
        } else {
            goToTab($(this).attr('data-target'));
        }
    });


    $("#logout").on('click', function () {
        firebase.auth().signOut();
        userData = null;
        $(".welcome").html('');
        goToTab('#login');
    });



    var loginUser = function (email, password) {
        firebase.auth().signInWithEmailAndPassword(email, password).catch(function (error) {
            console.log(error);
        });
    }

    $("#login-btn").on('click', function () {
        var email = $("#login-email").val();
        var password = $("#login-password").val();
        loginUser(email, password);
    });

    $("#signup-btn").on('click', function () {

        var email = $("#email").val();
        var password = $("#password").val();
        firebase.auth().createUserWithEmailAndPassword(email, password).then(function (authData) {
            firebase.auth().onAuthStateChanged(function (user) {
                if (user) {
                    addUserName(user.uid);
                    goToTab("#lists");
                    console.log("User " + user.uid + " is logged in");
                    userData = user;
                    console.log(userData);
                    loadProfile();
                    setUpFirebaseEvents();
                }
                else {
                    console.log("User is logged out");
                    $(".status").html('You are not logged in!').show();
                    userData = null;
                    listRef = null;
                }
            });
        }).catch(function (error) {
            console.log("Error creating user:", error);
            $("#signup-btn").parents("#register").find('.status').html("Error creating user:" + error).show();
        });


    });

    function randomIntFromInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    var addSubListItem = function (company, earnings) {
        var tempRef = firebase.database().ref('lists/sharedlist/items/' + companyKey);
        var postsRef = listRef;
        var parentCompany;
        tempRef.on('value', function (snap) { parentCompany = snap.child('company').val() });
        var childCompany = parentCompany + "||" + company;
        var x = Date();
        var random = randomIntFromInterval(1, 400);
        var Color = '#ffa500';
        var topzindex = $("#sharedlist li").getMaxZ() + 1;
        $temp = $("<li></li>");
        $temp.css({
            'position': 'absolute',
            'top': random + 'px',
            'left': random / 2 + 'px',
            'background': Color,
            'z-index': topzindex
        });
        var css = $temp.attr('style');
        try {
            var newItemRef = postsRef.push({
                company: childCompany,
                earnings: earnings,
                css: css
            });
        } catch (e) {
            $("#lists").find(".status").html(e);
        }

        var tempLink = [];
        tempRef.on('value', function (snap) { tempLink.link = snap.child('link').val() || [] });
        tempLink.link.push(subKey)
        firebase.database().ref('lists/sharedlist/items/' + companyKey).update({
            link: tempLink.link
        })


    }
    var addListItem = function (company, earnings) {
        var postsRef = listRef;
        var x = Date();
        var random = randomIntFromInterval(1, 400);
        var Color = '#ffa500';
        var topzindex = $("#sharedlist li").getMaxZ() + 1;
        $temp = $("<li></li>");
        $temp.css({
            'position': 'absolute',
            'top': random + 'px',
            'left': random / 2 + 'px',
            'background': Color,
            'z-index': topzindex
        });
        var css = $temp.attr('style');
        try {
            var newItemRef = postsRef.push({
                company: company,
                earnings: earnings,
                css: css
            });
        } catch (e) {
            $("#lists").find(".status").html(e);
        }
    }


    var removeItemFromFirebase = function (key) {
        var itemRef = firebase.database().ref('lists/sharedlist/items/' + key);
        var link = [];
        itemRef.on('value', function (snap) { link = snap.child('link').val() || [] });
        link.forEach(function (templink, i, link) {
            inRef = firebase.database().ref('lists/sharedlist/items/' + templink);
            inRef.remove();
        });
        itemRef.remove();
    }

    var editeItemInFirebase = function (key, earnings) {
        var itemRef = firebase.database().ref('lists/sharedlist/items/' + key);
        itemRef.update({
            earnings: earnings,
        });
    }


    var addCSSStringToItem = function (key, css) {
        var itemRef = firebase.database().ref('lists/sharedlist/items/' + key);
        itemRef.update({
            css: css,
        });
    }

    var SummaryEarnings = function (key) {
        var itemRef = firebase.database().ref('lists/sharedlist/items/' + key);
        var sumEarn;
        itemRef.on('value', function (snap) { sumEarn = snap.child('earnings').val() });
        var item = [];
        itemRef.on('value', function (snap) { item = snap.child('link').val() || [] });
        item.forEach(function (tempitem, i, item) {
            inRef = firebase.database().ref('lists/sharedlist/items/' + tempitem);
            var inCount;
            inRef.on('value', function (snap) {
                inCount = snap.child('sum').val();
                if (inCount === null) {
                    inCount = snap.child('earnings').val();
                }
            });
            sumEarn = parseInt(sumEarn, 10) + parseInt(inCount, 10);
        });
        itemRef.update({
            sum: sumEarn
        })
    }
});