/**
 * @author Yuri Plaksyuk <yuri.plaksyuk@chestnutcorp.com>
 * @since Feb 27, 2021
 */

(function($) {
	const attr = function(e, n) { const v = e.getAttribute(n); return v !== '' || e.hasAttribute(n) ? v : null; };

	const path = function(o, p) {
		if (p !== '.') {
			for (let r = null; o && p && (r = p.match(/^(\w+)(\.(.+))?$/)) != null; p = r[3])
				o = o[r[1]];
		}
		return o;
	};


	jQuery.fn.inject = function(o, x) {
		return this.each(function() {
			for (let i = this.attributes.length -1; i >= 0; --i) {
				const a = this.attributes[i];

				if (!/^data-inject/.test(a.name)) {
					let v = a.value, s = '', r = null;
					while ((r = v.match(/^([^$]*)\${([\w\.]+)}(.*)$/)) !== null) {
						s += r[1] + path(o, r[2]); v = r[3];
					}
					this.setAttribute(a.name, s + v);
				}
			}

			const r = attr(this, 'data-inject-ref');
			if (r) $(`#${r}`, x).clone().appendTo(this);

			const i = attr(this, 'data-inject-if');
			if (i) {
				const v = path(o, i);
				if (v === undefined) {
					$(this).remove();
					return;
				}
			}

			const j = attr(this, 'data-inject');
			if (j) {
				const v = path(o, j);
				if (Array.isArray(v)) {
					const c = $('<div></div>');

					let m, f, l;
					if ($(this).children('[data-inject-item]').appendTo(c).length > 0) {
						m = c.children('[data-inject-item=middle]');
						f = c.children('[data-inject-item=first]');
						l = c.children('[data-inject-item=last]');

						if (f.length == 0) f = m;
						if (l.length == 0) l = m;

					}
					else
						m = f = l = $(this).children().appendTo(c);

					for (let i = 0; i < v.length; ++i) {
						f.clone().inject(v[i], c).appendTo(this);
						f = i + 2 < v.length ? m : l;
					}
				}
				else if ($.isPlainObject(v))
					$(this).children().inject(v, x);
				else if (v === undefined)
					$(this).remove();
				else if (this.tagName === 'IMG')
					this.src = v;
				else if (this.tagName === 'A')
					this.href = v;
				else
					$(this).append(v);
			}
			else
				$(this).children().inject(o, x);
		});
	};
})(jQuery);
