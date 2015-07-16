// -*- coding: utf-8 -*-

var querystring = require('querystring')

function urlpageno(argUrl, argParampageno, argPageno, argOtherParams  ) {
    var params = argOtherParams  || {};
    params[argParampageno] = argPageno; // add param pageno=X
    return argUrl + '?' + querystring.stringify(params);
}

function paginate(argOpts) {

    // --------------------------------------------------------------------------------------------------------
    // options
    // --------------------------------------------------------------------------------------------------------
    var opts = argOpts || {};
    opts.url = 'url' in opts ? opts.url : '/unknowurl';
    opts.params = 'params' in opts ? opts.params : {};
    opts.firstText = 'firstText' in opts ? opts.firstText : '&laquo;&laquo;';
    opts.prevText = 'prevText' in opts ? opts.prevText : '&laquo;';
    opts.nextText = 'nextText' in opts ? opts.nextText : '&raquo;';
    opts.lastText = 'lastText' in opts ? opts.lastText : '&raquo;&raquo;';
    opts.dotText = 'dotText' in opts ? opts.dotText : '&#8230;';
    opts.parampageno = 'parampageno' in opts ? opts.parampageno : 'pageno';
    opts.totalItem = 'totalItem' in opts ? parseInt(opts.totalItem) : 1000;
    opts.itemPerPage = 'itemPerPage' in opts ? parseInt(opts.itemPerPage) : 10;
    opts.currentPage = 'currentPage' in opts ? parseInt(opts.currentPage) : 1;
    opts.showPrevNext = 'showPrevNext' in opts ? Boolean(opts.showPrevNext) : true;
    opts.hideDots = 'hideDots' in opts ? Boolean(opts.hideDots) : false; // si false alors afficher dots selon opts.DotsMidSize et opts.DotsEndSize
    opts.DotsMidSize = 'DotsMidSize' in opts ? parseInt(opts.DotsMidSize) : 4; // currentPage + X step before dot
    opts.DotsEndSize = 'DotsEndSize' in opts ? parseInt(opts.DotsEndSize) : 2; // dot + X step before end
    opts.showFirstLast = 'showFirstLast' in opts ? Boolean(opts.showFirstLast) : true;
    opts.addSep = 'addSep' in opts ? opts.addSep : '';
    opts.showStep = 'showStep' in opts ? Boolean(opts.showStep) : true;
    opts.getJson = 'getJson' in opts ? Boolean(opts.getJson) : false;
    opts.setJson = 'setJson' in opts ? opts.setJson : false;

    // --------------------------------------------------------------------------------------------------------
    // json
    // --------------------------------------------------------------------------------------------------------
    var json = {};
    if ( opts.setJson !== false ) {
        json = opts.setJson;
        opts.getJson = false;
    } else {

        var total = parseInt(Math.ceil(opts.totalItem/opts.itemPerPage));
        var dots = false;

        // options
        json.options = {}
        json.options.showFirstLast = opts.showFirstLast;
        json.options['showPrevNext'] = opts.showPrevNext;
        json.options['showStep'] = opts.showStep;
        json.options['showPrevNext'] = opts.showPrevNext;
        json.options.showFirstLast = opts.showFirstLast;

        // first
        if (opts.showFirstLast) {
            json.first = {}
            json.first.text = opts.firstText;
            if( 1 == opts.currentPage) {
                json.first.cssclass = 'disable';
                json.first.href = '#';
            } else {
                json.first.cssclass = '';
                json.first.href = urlpageno(opts.url, opts.parampageno, 1, opts.params);
            }
        }

        // previous
        if (opts.showPrevNext) {
            json.previous = {}
            json.previous.text = opts.prevText;
            if( 1 == opts.currentPage) {
                json.previous.cssclass = 'disable';
                json.previous.href = '#';
            } else { // 1 < opts.currentPage
                json.previous.cssclass = '';
                json.previous.href = urlpageno(opts.url, opts.parampageno, opts.currentPage - 1, opts.params);
            }
        }

        // step & dots
        if (opts.showStep) {
            json.step = []
            for (var i=1; i <= total; i++) {
                if (i === opts.currentPage) {

                    json.step.push({
                        ispageno : true,
                        cssclass : 'active',
                        href : '#',
                        text : i.toString()
                    });

                    dots = true;
                } else {
                    if (opts.hideDots || (i <= opts.DotsEndSize || (opts.currentPage && i >= opts.currentPage - opts.DotsMidSize && i <= opts.currentPage + opts.DotsMidSize) || i > total - opts.DotsEndSize)) {

                        json.step.push({
                            ispageno : true,
                            cssclass : '',
                            href : urlpageno(opts.url, opts.parampageno, i, opts.params),
                            text : i.toString()
                        });

                        dots = true;
                    } else if (dots === true && !opts.hideDots) {

                        json.step.push({
                            ispageno : false,
                            cssclass : 'disabled',
                            href : '#',
                            text : opts.dotText
                        });

                        dots = false;
                    }
                }
            }
        }

        // next
        if (opts.showPrevNext) {
            json.next = {}
            json.next.text = opts.nextText;
            if( total == opts.currentPage) {
                json.next.cssclass = 'disable';
                json.next.href = '#';
            } else { // opts.currentPage < total
                json.next.cssclass = '';
                json.next.href = urlpageno(opts.url, opts.parampageno, opts.currentPage + 1, opts.params);
            }
        }

        // last
        if (opts.showFirstLast) {
            json.last = {}
            json.last.text = opts.lastText;
            if( total == opts.currentPage) {
                json.last.cssclass = 'disable';
                json.last.href = '#';
            } else {
                json.last.cssclass = '';
                json.last.href = urlpageno(opts.url, opts.parampageno, total, opts.params);
            }
        }
    }

    // --------------------------------------------------------------------------------------------------------
    // return json ?
    // --------------------------------------------------------------------------------------------------------
    if (opts.getJson === true ) {
        return json;
    }

    // --------------------------------------------------------------------------------------------------------
    // json to html twitter bootstrap
    // --------------------------------------------------------------------------------------------------------
    var html = [];

    // begin
    html.push('<div><ul class="pagination">');
    html.push(opts.addSep);

    // first
    if (json.options.showFirstLast) {
        html.push('<li class="'+json.first.cssclass+'">');
        html.push('<a href="');
        html.push(json.first.href);
        html.push('">');
        html.push(json.first.text);
        html.push('</a></li>');
        html.push(opts.addSep);
    }

    // previous
    if (json.options['showPrevNext']) {
        html.push('<li class="'+json.previous.cssclass+'">');
        html.push('<a href="');
        html.push(json.previous.href);
        html.push('">');
        html.push(json.previous.text);
        html.push('</a></li>');
        html.push(opts.addSep);
    }

    // step & dots
    if (opts.showStep) {
        for (var i=0; i < json.step.length; i++) {
            html.push('<li class="'+json.step[i].cssclass+'">');
            html.push('<a href="');
            html.push(json.step[i].href);
            html.push('">');
            html.push(json.step[i].text);
            html.push('</a></li>');
            html.push(opts.addSep);
        }
    }

    // next
    if (json.options['showPrevNext']) {
        html.push('<li class="'+json.next.cssclass+'">');
        html.push('<a href="');
        html.push(json.next.href);
        html.push('">');
        html.push(json.next.text);
        html.push('</a></li>');
        html.push(opts.addSep);
    }

    // last
    if (json.options.showFirstLast) {
        html.push('<li class="'+json.last.cssclass+'">');
        html.push('<a href="');
        html.push(json.last.href);
        html.push('">');
        html.push(json.last.text);
        html.push('</a></li>');
        html.push(opts.addSep);
    }

    // end
    html.push('</ul></div>');
    return html.join('');

}

module.exports = function(app) {
    return paginate;
};

//~ console.log(paginate({getJson:true}));
//~ console.log(paginate({showStep:false})+"\n");
//~ console.log(paginate({showStep:true})+"\n");
