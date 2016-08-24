'use strict';

var vm = require("vm");
var extend = require("extend");

var escape = function (markup) {
  if (!markup) return '';
  return String(markup)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;');
};

var getContentNearError = function (error, templateLines) {
  var near = '';
  try {
    var line = error.stack.split('\n')[1].split(':')[1] - 1;
    near = '';
    for (var i = Math.max(0, line - 2); i < Math.min(templateLines.length, line + 3); i++) {
      near += ((i + 1) + (line == i ? ' >' : '  ') + ' | ') + templateLines[i] + '\n';
    }
  } catch (e) {
  }

  return near;
};


module.exports = function Renderer(template, helper) {
  // template helper
  var helpers = extend(escape.bind(null), helper);

  var vmTemplate = new vm.Script('(data)=>{with(data){return `' + template + '`}}', {
    filename: 'your-template.tpl'
  });
  vmTemplate = vmTemplate.runInNewContext({
    _: helpers
  });
  var vmTemplateLines = template.split('\n');

  return function (data) {
    try {

      return vmTemplate(data)
    } catch (e) {
      e.wrapper = getContentNearError(e, vmTemplateLines);
      e.kind = 'render error';

      throw e;
    }
  }
};