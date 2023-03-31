var codePath;

////////////////////////////////////////////////////////////////////////////////
//                             CONSTANTS                                      //
////////////////////////////////////////////////////////////////////////////////

const filesArray = ['html', 'css', 'js', 'fields', 'data']

const ini = `[HTML]
path = "html.txt"

[CSS]
path = "css.txt"

[JS]
path = "js.txt"

[FIELDS]
path = "fields.txt"

[DATA]
path = "data.txt"
`

////////////////////////////////////////////////////////////////////////////////
//                             FUNCTIONS                                      //
////////////////////////////////////////////////////////////////////////////////

function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

function handleFile(file, type) {
    let fr = new FileReader();
    $(`.${type}-select span`).text(file.name);
    fr.readAsText(file, "UTF-8");
    fr.onload = function (data) {
        switch (type) {
            case 'html':
                window.postMessage([data.target.result, 'html']);
                break;
            case 'css':
                window.postMessage([data.target.result, 'css']);
                break;
            case 'js':
                window.postMessage([data.target.result, 'js']);
                break;
            case 'fields':
                window.postMessage([data.target.result, 'fields']);
                break;
            case 'data':
                window.postMessage([data.target.result, 'data']);
                break;
            default:
                break;
        }
    }
}

function loadZipAndPopulateSeInputFields(file) {
    const zip = new JSZip();
    zip.loadAsync(file).then((zip) => {
        $('.zip-select span').text(file.name);

        if (zip.files['widget.ini']) {
            zip.files[`widget.ini`].async('string').then((data) => {
                try {
                    readFiles(zip, parseIniManifest(data));
                } catch (err) {
                    alert('This widget was not set up properly. Opening manual upload dialog...')
                    handleUnsupported(zip);
                }
            });
        } else if (zip.files['manifest.json']) {
            zip.files['manifest.json'].async('string').then((data) => {
                try {
                    readFiles(zip, parseJsonManifest(data));
                } catch (err) {
                    alert('This widget was not set up properly. Opening manual upload dialog...')
                    handleUnsupported(zip);
                }
            });
        } else {
            handleUnsupported(zip);
        }
    });
}

function handleUnsupported(zip) {
    resetSession()

    waitForElm('#sigma-create-unsupported').then(() => {
        $('#sigma-create-unsupported').click(() => {
            $('#zip').val('')
            $('.zip-select span').text('No file selected...')
            handleCode(codePath)
        });
    });

    filesArray.forEach((type) => {
        waitForElm(`#${type}`).then(() => {
            $(`#${type}`).on("change", function (evt) {
                console.log('Change detected')
                var files = evt.target.files;
                for (var i = 0; i < files.length; i++) {
                    handleFile(files[i], type);
                }
            });
        })
    })

    var backdrop = $(`
        <md-backdrop class="md-dialog-backdrop md-opaque" 
                     style="position: fixed;" aria-hidden="true">
        </md-backdrop>`)
    $('body').prepend(backdrop)
    $('body').append(dialog)

    // Handle click outside of dialog
    $(window).click(() => {
        $('.sigma-extension-dialog').remove()
        $(backdrop).remove()
    })
    $('.sigma-dialog').click((event) => {
        event.stopPropagation();
    })
}

function parseIniManifest(data) {
    const iniKeyOutKeyMap = {
        '[HTML]': 'html',
        '[CSS]': 'css',
        '[JS]': 'js',
        '[FIELDS]': 'fields',
        '[DATA]': 'data'
    };

    const outputFile = Object.fromEntries(
        Object.values(iniKeyOutKeyMap).map((k) => [k, undefined]),
    );

    const lines = data.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
        Object.keys(iniKeyOutKeyMap).forEach((k) => {
            if (iniKeyOutKeyMap[k] !== undefined) {
                throw new Error('Malformed ini file.');
            }
            if (lines[i].includes(k)) {
                outputFile[iniKeyOutKeyMap[k]] = lines[i + 1].split('"');
            }
        });
    }

    // At this point, we should have populated every field.
    Object.keys(iniKeyOutKeyMap).forEach((k) => {
        if (iniKeyOutKeyMap[k] === undefined) {
            throw new Error('Malformed ini file.');
        }
    });

    return outputFile;
}

function parseJsonManifest(data) {
    const files = JSON.parse(data).fileMap;
    if (!files) {
        throw new Error('Malformed json file');
    }

    return files;
}

function readFiles(zip, pathObj) {
    const sourceCode = { html: '', css: '', js: '', fields: '', data: '' };

    let fieldsLeft = Object.keys(sourceCode).length;
    Object.keys(sourceCode).forEach((k) => {
        zip.files[pathObj[k]].async('string').then((data) => {
            sourceCode[k] = data;
            fieldsLeft--;

            if (fieldsLeft === 0) {
                window.postMessage([
                    [sourceCode.html, sourceCode.css, sourceCode.js, sourceCode.fields, sourceCode.data],
                    'zip'
                ]);
            }
        });
    })
}

function handleCode(path) {
    $('widget-creator > button').click();
    tab = $('.widget-creator__items').children()[4];
    tab_content = $(tab).children()[4];
    widget_button = $(tab_content).children()[5];
    $(widget_button).click();

    $('.custom-event-list-editor-button-container > button').click();

    waitForElm('.html-editor .CodeMirror').then(() => {
        const htmlEditor = $('.html-editor .CodeMirror')[0].CodeMirror
        if (path[0]) {
            htmlEditor.setValue(path[0]);
        } else {
            htmlEditor.setValue('');
        }

        const fields = $('._md-nav-bar-list').children();
        $($(fields[1]).children()[0]).click();
    });

    waitForElm('.css-editor .CodeMirror').then(() => {
        const cssEditor = $('.css-editor .CodeMirror')[0].CodeMirror;
        if (path[1]) {
            cssEditor.setValue(path[1]);
        } else {
            cssEditor.setValue('');
        }

        const fields = $('._md-nav-bar-list').children();
        $($(fields[2]).children()[0]).click();
    });

    waitForElm('.js-editor .CodeMirror').then(() => {
        const jsEditor = $('.js-editor .CodeMirror')[0].CodeMirror;
        if (path[2]) {
            jsEditor.setValue(path[2]);
        } else {
            jsEditor.setValue('')
        }

        const fields = $('._md-nav-bar-list').children();
        $($(fields[3]).children()[0]).click();
    });

    waitForElm('.fields-editor .CodeMirror').then(() => {
        const fieldsEditor = $('.fields-editor .CodeMirror')[0].CodeMirror;
        if (path[3]) {
            fieldsEditor.setValue(path[3]);
        } else {
            fieldsEditor.setValue('')
        }

        const fields = $('._md-nav-bar-list').children();
        $($(fields[4]).children()[0]).click();
    });

    waitForElm('.field-data-editor .CodeMirror').then(() => {
        const dataEditor = $('.field-data-editor .CodeMirror')[0].CodeMirror;
        if (path[4]) {
            dataEditor.setValue(path[4]);
        } else {
            dataEditor.setValue('')
        }

        $('.exit-code-editor').click()
    });
}

function writeCode() {
    var zip = new JSZip()
    zip.file('widget.ini', ini)
    codeArray = [];

    var value = $('#widgets')[0].value
    var widgetList = $('span[ng-show="!vm.editableWidgetNames[widget.id]"]')
    widgetList.each((el) => {
        if (widgetList[el].innerText === value) {
            $($(widgetList[el]).parent()[0]).click()
        }
    })

    $('.custom-event-list-editor-button-container > button').click();

    waitForElm('.html-editor .CodeMirror').then(() => {
        const htmlEditor = $('.html-editor .CodeMirror')[0].CodeMirror
        //codeArray.push(htmlEditor.getValue())
        zip.file('html.txt', htmlEditor.getValue())

        const fields = $('._md-nav-bar-list').children();
        $($(fields[1]).children()[0]).click();
    });

    waitForElm('.css-editor .CodeMirror').then(() => {
        const cssEditor = $('.css-editor .CodeMirror')[0].CodeMirror;
        //codeArray.push(cssEditor.getValue())
        zip.file('css.txt', cssEditor.getValue())

        const fields = $('._md-nav-bar-list').children();
        $($(fields[2]).children()[0]).click();
    });

    waitForElm('.js-editor .CodeMirror').then(() => {
        const jsEditor = $('.js-editor .CodeMirror')[0].CodeMirror;
        //codeArray.push(jsEditor.getValue())
        zip.file('js.txt', jsEditor.getValue())

        const fields = $('._md-nav-bar-list').children();
        $($(fields[3]).children()[0]).click();
    });

    waitForElm('.fields-editor .CodeMirror').then(() => {
        const fieldsEditor = $('.fields-editor .CodeMirror')[0].CodeMirror;
        //codeArray.push(jsEditor.getValue())
        zip.file('fields.txt', fieldsEditor.getValue())

        const fields = $('._md-nav-bar-list').children();
        $($(fields[4]).children()[0]).click();
    });

    waitForElm('.field-data-editor .CodeMirror').then(() => {
        const dataEditor = $('.field-data-editor .CodeMirror')[0].CodeMirror;
        //codeArray.push(fieldsEditor.getValue())
        zip.file('data.txt', dataEditor.getValue())

        $('.exit-code-editor').click();
        zip.generateAsync({ type: "blob" }).then(function (blob) {
            saveAs(blob, `${value}.zip`);
        });
    });


}

function resetSession() {
    $('#zip').val('')
    $('#html').val('')
    $('#css').val('')
    $('#js').val('')
    $('#fields').val('')
    $('#data').val('')

    $('.zip-select span').text('No file selected...')
    $('.html-select span').text('No file selected...')
    $('.css-select span').text('No file selected...')
    $('.js-select span').text('No file selected...')
    $('.fields-select span').text('No file selected...')
    $('.data-select span').text('No file selected...')

    codePath = []
}

////////////////////////////////////////////////////////////////////////////////
//                             ACTION SCRIPTS                                 //
////////////////////////////////////////////////////////////////////////////////

waitForElm('#zip').then(() => {
    codePath = []
    $('#zip').on("change", function (evt) {
        var files = evt.target.files;
        for (var i = 0; i < files.length; i++) {
            loadZipAndPopulateSeInputFields(files[i]);
        }
    });
});

waitForElm('#sigma-create').then(() => {
    $('#sigma-create').click(() => {
        $('#zip').val('')
        $('.zip-select span').text('No file selected...')
        handleCode(codePath)
    });
});

waitForElm('#sigma-save').then(() => {
    $('#sigma-save').click(() => {
        writeCode()
    });
});

////////////////////////////////////////////////////////////////////////////////
//                          EVENT LISTENERS                                   //
////////////////////////////////////////////////////////////////////////////////

window.addEventListener("message", function (event) {
    if (event.data[1] === 'zip') {
        codePath = event.data[0];
    }
    else if (event.data[1] === 'html') {
        codePath[0] = event.data[0];
    }
    else if (event.data[1] === 'css') {
        codePath[1] = event.data[0];
    }
    else if (event.data[1] === 'js') {
        codePath[2] = event.data[0];
    }
    else if (event.data[1] === 'fields') {
        codePath[3] = event.data[0];
    }
    else if (event.data[1] === 'data') {
        codePath[4] = event.data[0];
    }
});

////////////////////////////////////////////////////////////////////////////////
//                             HTML SOURCES                                   //
////////////////////////////////////////////////////////////////////////////////

const dialog = `
<div class="sigma-extension-dialog">
    <div class="md-dialog-container sigma-dialog-container" tabindex="-1" md-theme="default"
        style="top: 0px; height: 961px;">
        <div class="md-dialog-focus-trap" tabindex="0"></div>
        <md-dialog class="sigma-dialog overlay-editor__session-data-dialog__root _md md-default-theme md-transition-in"
            md-theme="default" role="dialog" tabindex="-1" aria-describedby="dialogContent_111" style="">
            <div class="title-area">
                <h3>Manual upload</h3>
                <p>
                    Unfortunately, the ZIP you uploaded is not supported by this
                    extension. Do not fret, however! You can manually provide
                    the required files. Open the ZIP and locate files with names
                    that either contain or otherwise resemble <a>"html.txt"</a>, <a>"css.txt"</a>,
                    <a>"js.txt"</a>, and <a>"fields.txt"</a>. Refer to the instructions that
                    came with your widget to find these files or their equivalents.
                 </p>
                 <p>
                    Then, select each file in the respective box below, and click
                    "Create widget". Enjoy!
                </p>
            </div>
            <div class="upload-area">
                <div class="selection">
                    <p>Select widget HTML file</p>
                    <div class="html-select">
                        <span>No file selected...</span>
                        <label for="html" class="sigma-file-upload">
                            Upload
                        </label>
                    </div>
                    <input type="file" id="html" name="zip" accept=".txt,.html">
                </div>
                <div class="selection">
                    <p>Select widget CSS file</p>
                    <div class="css-select">
                        <span>No file selected...</span>
                        <label for="css" class="sigma-file-upload">
                            Upload
                        </label>
                    </div>
                    <input type="file" id="css" name="zip" accept=".txt,.css">
                </div>
                <div class="selection">
                    <p>Select widget JS file</p>
                    <div class="js-select">
                        <span>No file selected...</span>
                        <label for="js" class="sigma-file-upload">
                            Upload
                        </label>
                    </div>
                    <input type="file" id="js" name="zip" accept=".txt,.js">
                </div>
                <div class="selection">
                    <p>Select widget FIELDS file</p>
                    <div class="fields-select">
                        <span>No file selected...</span>
                        <label for="fields" class="sigma-file-upload">
                            Upload
                        </label>
                    </div>
                    <input type="file" id="fields" name="zip" accept=".txt,.json">
                </div>
                <div class="selection">
                    <p>Select widget DATA file</p>
                    <div class="data-select">
                        <span>No file selected...</span>
                        <label for="data" class="sigma-file-upload">
                            Upload
                        </label>
                    </div>
                    <input type="file" id="data" name="zip" accept=".txt,.json">
                </div>
            </div>
            <ext-button id="sigma-create-unsupported">CREATE WIDGET</ext-button>
        </md-dialog>
        <div class="md-dialog-focus-trap" tabindex="0"></div>
    </div>
</div>
`
