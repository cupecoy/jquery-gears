$(function() {

    const getBasis = (el) => {
        return $(el).data('basis');
    }

    const setBasis = (prevEl, nextEl, prevDimension, nextDimension, maxBasis) => {
        prevBasis = prevDimension / (prevDimension + nextDimension) * maxBasis;
        nextBasis = nextDimension / (prevDimension + nextDimension) * maxBasis;

        const lessBasis = Math.min(prevBasis, nextBasis);
        const biggestBasis = maxBasis - lessBasis;

        prevBasis = lessBasis == prevBasis ? lessBasis : biggestBasis;
        nextBasis = lessBasis == nextBasis ? lessBasis : biggestBasis;

        $(prevEl).data('basis', prevBasis).css('flex-basis', prevBasis + '%');
        $(nextEl).data('basis', nextBasis).css('flex-basis', nextBasis + '%');
    }

    const init = (rowGap, columGap, templates, resizerProp) => {
        const resizer ={
            rows    : $('<div class="ui-resizer ui-resizer-horizontal"></div>').css('height', rowGap).addClass(resizerProp.class).addClass(resizerProp.rows ? resizerProp.rows.class : ''),
            columns : $('<div class="ui-resizer ui-resizer-vertical"></div>').css('width', columGap).addClass(resizerProp.class).addClass(resizerProp.columns ? resizerProp.columns.class : ''),
        };

        if (resizerProp.class)
            delete resizerProp.class;
        if (resizerProp.rows && resizerProp.rows.class)
            delete resizerProp.rows.class;
        if (resizerProp.columns && resizerProp.columns.class)
            delete resizerProp.columns.class;

        $.each(resizerProp, (attr, value) => {
            if (!['object', 'array'].includes(typeof value)) {
                $(resizer.rows).add(resizer.columns).attr(attr, value);
            }
            else if (typeof value === 'object' && resizer[attr].length) {
                $(resizer[attr]).attr(value);
            }
        })

        $.each({'rows' : 'height', 'columns' : 'width'}, (rc, dimension) => {
            const coefs = templates[rc].length ? templates[rc] : [];
            $(`.ui-resizable-${rc}`).each((_, els) => {
                if(coefs.length == 0)  
                    $(els).children().each((_, el) => {
                        const basis     = dimension == 'width' ? $(el).outerWidth() : $(el).outerHeight();    
                        coefs.push(basis);
                    })
    
                const sum = coefs.reduce((acc, v) => {return acc + v}, 0);
                $(els).children().each((i, column) => {
                    const basis = coefs[i] / sum * 100
                    $(column).data('basis', basis).css('flex-basis', basis + '%');
                })
    
                $(els).children().not(':first').before(resizer[rc].clone())
            })
        })
    }

    $(document).on('mousedown', '.ui-resizable-container .ui-resizer', function(event) {
        var moved = 0;

        var resizer = this;

        var prevEl = $(this).prev();
        var nextEl = $(this).next();

        var prevElBasis = getBasis(prevEl);
        var nextElBasis = getBasis(nextEl);

        var prevElWidth  = $(prevEl).outerWidth();
        var prevElHeight = $(prevEl).outerHeight();

        var nextElWidth  = $(nextEl).outerWidth();
        var nextElHeight = $(nextEl).outerHeight();

        var maxWidth  = prevElWidth  + nextElWidth;
        var maxHeight = prevElHeight + nextElHeight;

        $('.ui-resizable-container').css('user-select', 'none');
        $('.ui-resizable-container').on('mousemove', function(event) {


            const axis = $(resizer).is('.ui-resizer-vertical') ? 'X' : 'Y';

            moved += event.originalEvent[`movement${axis}`]

            let prevElDimension = axis == 'X' ? prevElWidth : prevElHeight;
            let nextElDimension = axis == 'X' ? nextElWidth : nextElHeight;

            let maxDimension = axis == 'X' ? maxWidth : maxHeight;
            let maxBasis     = prevElBasis + nextElBasis;

            let newPrevDimension = Math.max( Math.min(prevElDimension + moved, maxDimension), 0);
            let newNextDimension = Math.max( Math.min(nextElDimension - moved, maxDimension), 0);

            setBasis(prevEl, nextEl, newPrevDimension, newNextDimension, maxBasis);

            prevElDimension = axis == 'X' ? $(prevEl).outerWidth() : $(prevEl).outerHeight();
            nextElDimension = axis == 'X' ? $(nextEl).outerWidth() : $(nextEl).outerHeight();

            prevElDimension = moved < 0 ? prevElDimension : maxDimension - nextElDimension;
            nextElDimension = moved > 0 ? nextElDimension : maxDimension - prevElDimension;

            setBasis(prevEl, nextEl, prevElDimension, nextElDimension, maxBasis);

        })
    })
    .on('mouseup', function(event) {
        $('.ui-resizable-container').css('user-select', 'auto');
        $('.ui-resizable-container').unbind('mousemove');
    })

    $.fn.resizableGroup = function(options = {}) {
        const parent = this;

        const {gap, rowGap = gap, columGap = gap, rowsTemplate = [], columnsTemplate = [], resizer = {}} = options;
        $(this).addClass('ui-resizable-container');

        init(rowGap, columGap, {'rows' : rowsTemplate, 'columns' : columnsTemplate}, resizer);
    }
})