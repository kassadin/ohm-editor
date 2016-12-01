/* eslint-env browser */
/* global CheckedEmitter, saveAs */

'use strict';

var ohmEditor = require('./ohmEditor');
var domUtil = require('./domUtil');

function initLocal() {
  var $ = domUtil.$;

  $('#grammars').hidden = false;

  var loadedGrammar = 'unnamed.ohm';
  var grammarName = $('#grammarName');

  var loadButton = $('#loadGrammar');
  var grammarFile = $('#grammarFile');
  loadButton.addEventListener('click', function(e) {
    grammarFile.click();
  });
  grammarFile.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) {
      return;
    }
    var reader = new FileReader();
    var filename = file.name;
    reader.onload = function(e) {
      var src = e.target.result;
      loadedGrammar = filename;
      grammarName.textContent = filename;
      grammarName.classList.remove('unnamed');

      ohmEditor.ui.grammarEditor.setValue(src);
    };
    reader.readAsText(file);
  }, false);

  var saveButton = $('#saveGrammar');
  saveButton.addEventListener('click', function(e) {
    var src = ohmEditor.ui.grammarEditor.getValue();
    // var url = 'data:application/stream;base64,' + btoa(src);
    // window.location = url;

    // use application/octet-stream to force download (not text/ohm-js;charset=utf-8)
    var blob = new Blob([src], {type: 'application/octet-stream'});
    saveAs(blob, loadedGrammar);
  });

  // local storage
  ohmEditor.addListener('change:grammar', function(source) {
    ohmEditor.saveState(ohmEditor.ui.grammarEditor, 'grammar');
  });
}

function initServer(grammars) {
  var $ = domUtil.$;

  function getFromURL(url, cb) {
    var httpObj = new XMLHttpRequest();
    httpObj.onreadystatechange = function() {
      if (httpObj.readyState === 4 && httpObj.status === 200) {
        cb(httpObj.responseText);
      }
    };
    httpObj.open('GET', url, true);
    httpObj.send();
  }

  function postToURL(url, data, cb) {
    var httpObj = new XMLHttpRequest();
    httpObj.onreadystatechange = function() {
      if (httpObj.readyState === 4 && httpObj.status === 200) {
        cb(httpObj.responseText);
      }
    };
    httpObj.open('POST', url, true);
    httpObj.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    httpObj.send(data);
  }

  $('#grammars').hidden = false;
  $('#grammarName').hidden = true;
  $('#saveIndicator').hidden = false;

  var grammarList = $('#grammarList');
  grammarList.hidden = false;
  grammars.forEach(function(grammar) {
    var option = document.createElement('option');
    option.text = grammar;
    grammarList.add(option);
  });
  grammarList.addEventListener('change', function(e) {
    var grammar = e.target.options[e.target.selectedIndex].value;
    if (grammar === '') { // local storage
      ohmEditor.restoreState(ohmEditor.ui.grammarEditor, 'grammar', $('#sampleGrammar'));
      return;
    }

    getFromURL('../grammars/' + grammar, function(src) {
      ohmEditor.once('change:grammar', function(_) {
        $('#saveIndicator').classList.remove('edited');
      });

      var doc = CodeMirror.Doc(src, 'null');
      ohmEditor.ui.grammarEditor.swapDoc(doc);
    });
  });

  $('#loadGrammar').hidden = true;
  $('#saveGrammar').hidden = true;

  ohmEditor.ui.grammarEditor.setOption('extraKeys', {
    'Cmd-S': function(cm) {
      var grammar = grammarList.options[grammarList.selectedIndex].value;
      if (grammar === '') {
        return;
      }

      postToURL('../grammars/' + grammar, cm.getValue(), function(response) {
        $('#saveIndicator').classList.remove('edited');
      });
    }
  });

  ohmEditor.addListener('change:grammar', function(source) {
    var grammar = grammarList.options[grammarList.selectedIndex].value;
    if (grammar === '') { // local storage
      ohmEditor.saveState(ohmEditor.ui.grammarEditor, 'grammar');
    } else {
      $('#saveIndicator').classList.add('edited');
    }
  });
}

// Main
// -------

if (window.location.protocol !== 'file:') {
  var grammars = {
    official: [
      '7f62adb8df879a5eb8288dbbddcc663f' // Arithmetic
    ]
  };
  initServer(grammars);
} else {
  initLocal();
}

// Exports
// -------

module.exports = {
  local: initLocal,
  server: initServer
};
