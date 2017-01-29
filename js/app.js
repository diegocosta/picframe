var Croppie = require('croppie');
var Watermark = require('watermarkjs');

(function(){
    'use strict';

    var PicFrame = PicFrame || {};

    // Globals
    PicFrame.User = {};
    PicFrame.Croppie = null;
    PicFrame.Watermark = null;

    PicFrame.NavigateTo = function(selector)
    {
        var selectedPage = document.querySelector(selector);
        var currentPage = document.querySelector('.app-page__active');

        // toggle active page
        currentPage.classList.remove('app-page__active');
        selectedPage.classList.add('app-page__active');

        return selectedPage;
    };

    PicFrame.AuthService = function(onLoggedCallback)
    {
        var loginButton = document.querySelector('[data-login-action]');
        var logoutButton = document.querySelector('[data-logout-action]');

        if(loginButton) {
            loginButton.addEventListener('click', function(e){
                e.preventDefault();

                FB.login(function(response){
                    FB.api('/me', { fields: 'name,email'}, function(response){
                        PicFrame.User = {
                            'id' : response.id,
                            'name' : response.name,
                            'email' : response.email,
                            'image' : 'http://graph.facebook.com/' + response.id + '/picture?height=600&width=600',
                            'frame': null,
                            'result': null
                        };

                        onLoggedCallback(PicFrame.User);
                    });

                }, { scope: 'email,publish_actions,user_photos'});
            });
        }

        if(logoutButton) {
            logoutButton.addEventListener('click', function(e){
                e.preventDefault();

                FB.getLoginstatus(function(response){
                    if(response.status === 'connected')
                        FB.logout(function(response){
                            location.reload(true);
                        });
                });
            });
        }
    };

    PicFrame.ShareService = function()
    {
        var shareButton = document.querySelector('[app-result-share]');

        // exit if share button doest exists
        if(!shareButton) return;

        shareButton.addEventListener('click', function(e) {
            e.preventDefault();

            PicFrame.Watermark.blob(Watermark.image.atPos(function(){ return 0; }, function(){ return 0; }, 1)).then(function(blob){
                FB.login(function(response){

                    var form = new FormData();
                    form.append("access_token", response.authResponse.accessToken);
                    form.append("source", blob);
                    form.append("message", "Hello World");

                    var xhr = new XMLHttpRequest();
                    xhr.open('POST', 'https://graph.facebook.com/me/photos', true);
                    xhr.onload = xhr.onerror = function(){
                        console.log(xhr.responseText);
                    };
                    xhr.send( form );

                }, { scope: 'publish_actions,user_photos' });

            });
        });
    };

    PicFrame.ImageService = function(onUploadedFile)
    {
        var uploadButton = document.querySelectorAll('[app-upload-action]');

        // exit if upload button doest exists
        if(!uploadButton) return;

        // check browser support
        if(!window.FileReader){
            uploadButton.style.display = 'none';
            return alert('Seu navegador não é compatível com esse serviço.');
        }

        // check file type
        var isSupportedFileType = function(file)
        {
            var allowedExtensions = ['jpeg', 'jpg', 'png'];
        	var fileExtension = file.files[0].name.split('.').pop().toLowerCase();

        	if(allowedExtensions.indexOf(fileExtension) > -1)
        		return true;

        	alert('O arquivo carregado não é uma imagem suportada.');

        	return false;
        };

        // create dynamic (hidden) input file
        var inputFile = document.createElement('input');
        inputFile.type = "file";

        // listen change event on input
        inputFile.addEventListener('change', function(e){
            if(!isSupportedFileType(this)) return;

            // Load uploaded file
            if(this.files && this.files[0]) {
                var reader = new FileReader();

                reader.onload = function(e) {
                    PicFrame.User.image = e.target.result;

                    // Render file on Croppie
                    PicFrame.Croppie.bind({ url: PicFrame.User.image })
                };

                reader.readAsDataURL(this.files[0]);

                onUploadedFile(this);
            }
        });

        // listen click event on button
        uploadButton.forEach(function(button, index){
            button.addEventListener('click', function(e){
                e.preventDefault();

                // dispatch click event on input
                inputFile.click();
            });
        });
    };

    PicFrame.MainAction = function()
    {
        // load all pages
        var pages = document.querySelectorAll('[data-page]');

        Array.prototype.slice.call(pages).forEach(function(page, index) {
            page.classList.add('app-page');
            // set main page
            if(index === 0) page.classList.add('app-page__active');
        });

        // Enable services
        PicFrame.ShareService();

        PicFrame.ImageService(function(uploadedFile){
            PicFrame.FrameAction();
        });

        PicFrame.AuthService(function(loggedUser) {
            PicFrame.FrameAction();
        });
    };

    PicFrame.FrameAction = function()
    {
        // go to frame page
        PicFrame.NavigateTo('[data-page="frames"]');

        // initialize croppie & render profile image
        PicFrame.Croppie = (PicFrame.Croppie) ? PicFrame.Croppie : new Croppie(document.querySelector('.croppie'), {
            boundary : { width: 400, height: 400 },
            viewport : { width: 400, height: 400, type: 'square' },
            enableOrientation : true
        });

        if(PicFrame.User.image) {
            PicFrame.Croppie.bind({
                url: PicFrame.User.image
            });
        }

        // add loading gif
        var boundary = document.querySelector('.cr-boundary');
        boundary.classList.add('app-boundary-loading');

        // inject user name
        var title = document.querySelector('[app-username]');
        if(title) title.innerHTML = PicFrame.User.name;

        // enable frame choosing
        document.querySelectorAll('[data-frames-item]').forEach(function(frame, index){
            frame.addEventListener('click', function(e){
                e.preventDefault();

                PicFrame.User.frame = frame.getAttribute('data-frames-item');

                var viewport = document.querySelector('.cr-viewport');

                viewport.classList.add('app-viewport-frame');
                viewport.setAttribute('style', 'background-image: url(' + PicFrame.User.frame + ')');

                // enable result button
                var resultbutton = document.querySelector('[app-result-action]');
                resultbutton.style.display = 'block';
                resultbutton.addEventListener('click', function(e){
                    PicFrame.ResultAction();
                });
            });
        });
    };

    PicFrame.ResultAction = function()
    {
        // Get croppie result and...
        PicFrame.Croppie.result({ type: 'base64', size: { width: 600, height: 600 } }).then(function(result){

            // Merge image and frame
            PicFrame.Watermark = Watermark([result, PicFrame.User.frame], {
                init: function(img) {
                    img.crossOrigin = 'anonymous'
                }
            });

            // Generate merged image
            PicFrame.Watermark.dataUrl(Watermark.image.atPos(function(){ return 0; }, function(){ return 0; }, 1)).then(function(url){
                PicFrame.User.result = url;

                // Populate image preview
                var preview = document.querySelector('[app-result-preview]');
                preview.src = PicFrame.User.result;

                // Populate download link
                var download = document.querySelector('[app-result-download]');
                download.href = PicFrame.User.result;

                // go to result action
                PicFrame.NavigateTo('[data-page="result"]');
            });

        });
    };

    // ladies and gentlemen,
    // welcome to PicFrame.
    PicFrame.MainAction();
})();
