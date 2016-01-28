Dropzone.autoDiscover = false;
var uploading = false; // image upload status for forms
var uploaded  = [];

function loadImage(dropObj, id, prefix) {
    var url = prefix+'system.images/table?limit=1&_id='+id+'&f=';
    var row, data;
    
    $.ajax({
        type: 'GET',
        url: url,
        dataType: 'json',
        success: function(images) {
            if(images && images.rows) {
                for(r in images.rows) {
                    row  = images.rows[r];
                    data = {
                        name: row.name,
                        size: row.bytes,
                        serverId: row._id,
                        accepted: true,
                        status: Dropzone.SUCCESS,
                        url: row.path,
                        upload: {
                            progress: 100, // to fake
                            total: row.bytes, // to fake
                            bytesSent: row.bytes // to fake
                        }
                    };
                    
                    dropObj.files.push(data);
                    dropObj.emit('addedfile', data);
                    dropObj.emit('thumbnail', data, row.path);
                }
            }
        }
    });
}
    
function setFilter(filterObj, key, alias, type) {
    filterObj[key] = {
        key   : key,
        name  : alias,
        type  : type,
        opts  : $('.f-'+key+'-opts'),
        field : $('#f-'+key)
    };
}

function depends(data, alias) {
    var depObj = {}, depVal;
    
    for(d in data) {
        depVal = data[d];
        
        if( depVal && Object.prototype.toString.call(depVal) != '[object Array]')
            depVal = [depVal];

        depObj['#field-'+d+' select'] = {values: depVal};
    }

    $('#field-'+alias).dependsOn(depObj, {duration: 0});
}

function closeObjectItem(obj) {
    $(obj).parent().parent().remove();
}

function addObject(obj, object, alias) {
    var index = parseInt($(obj).attr('data-index'));
    var forms = $('#field-'+alias+' .f-arrayOfObjects-forms .row');
    var url   = '/admin/form/'+object+'/'+alias+'/'+index;

    $.ajax({
        type: 'POST',
        url: url,
        success: function(html) {
            forms.append('<div class="col-md-4"><div class="well"><a href="javascript:void(0)" type="button" class="close" aria-label="Close" onclick="closeObjectItem(this);"><span aria-hidden="true">&times;</span></a>'+html+'</div></div>');
            $(obj).attr('data-index', index+1);
        }
    });
}

function loadObject(object, alias, id) {
    var button = $('#field-'+alias+' button');
    var url    = '/admin/form/'+object+'/'+alias+'?id='+id;
    var forms  = $('#field-'+alias+' .f-arrayOfObjects-forms .row');
    
    forms.html('<div class="col-md-12"><div class="well">loading...</div></div>');
    
    $.ajax({
        type: 'POST',
        url: url,
        dataType: 'json',
        success: function(resp) {
            button.attr('data-index', resp.index);
            forms.html(resp.html);
        }
    });
}