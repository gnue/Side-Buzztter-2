// ==UserScript==
// @name			Side Buzztter 2
// @namespace		http://so-kukan.com/
// @description		Twitter のサイドメニューで buzztter の抽出したトレンドワードを表示できるようにします
// @include			https://twitter.com/*
// @include			http://twitter.com/*
// ==/UserScript==
// UPDATE INFO http://github.com/gnue/Side-Buzztter-2
//
// 動作環境
//   * Safari + GreaseKit
//   * Firefox + Greasemonkey
//   * Mac OS 10.5 でのみ確認
//
// 更新履歴
//   [2010-10-12] 1.0		Twitterの新Web UIに対応
//
// To Do
//	 * ユーザ設定の変更機能


(function() {

// Side Buzztter に関する情報
var sb_info = {
	version:	'0.9.4.1',							// バージョン番号

	title:		'Buzztter',							// サイドバーに表示するタイトル
	id:			'buzztter',							// id
	callback:	'update_side_buzztter',				// JSONPのコールバック関数
	url:		'http://buzztter.com/$(lang)/rss',	// Buzztter RSS の URL（$lang は言語で置換え）
	jsonp_url:	'http://pipes.yahoo.com/pipes/pipe.run?_id=HLE5vPpS3hGu0eq4wTSbTQ&_render=json&_callback=$(callback)&lang=$(lang)&num=$(num)',
													// Buzztter RSS を JSONP に変換するための Y!Pipes
	styles:	[
		'.loading#buzztter h2 { background:url("https://s3.amazonaws.com/twitter_production/a/1286563368/images/spinner.gif") no-repeat right center transparent; }',
		'.collapsible#buzztter h2 { min-width:208px; }',
		'.collapsible#buzztter h2 { background:url("https://s3.amazonaws.com/twitter_production/a/1286563368/images/toggle_up_dark.png") no-repeat right center transparent; }',
		'.collapsible#buzztter h2:hover { cursor:pointer; }',
		'.collapsible.collapsed#buzztter h2 { background:url("https://s3.amazonaws.com/twitter_production/a/1286563368/images/toggle_down_dark.png") no-repeat right center transparent; }',
		'.collapsible.collapsed#buzztter ul { display:none; }',
		'.buzztter-inner { display:block, width:208px; float:left; }',
		'.buzztter-inner ul.sidebar-menu { width:208px; }',
		'.cloud#buzztter ul.sidebar-menu li, .cloud#buzztter ul.sidebar-menu li a { display:inline; width:auto; padding:2px; }',
		'.cloud#buzztter ul.sidebar-menu li a span { display:inline-block; width:auto; }',
	],

	// 設定のデフォルト値（これは修正しない。user_config のほうを修正すること）
	hidden_component:	['trends-inner'],			// 非表示にするコンポーネント
	sidebar_inserts:	['trends-inner', 'your-activity'],
													// サイドバーの挿入位置
	updateInterval:		60 * 5,						// 更新インターバル（秒）
	showModtime:		false,						// 更新時間の表示
//	lang:				'ja',						// 言語（'ja' or 'en'）
	num:				20,							// 表示数
	style:				'cloud',					// 表示スタイル（'cloud', 'list', or null）
};


var __FILE__ = 'side_buzztter2.user.js';	// ファイル名
var try_count = 20;
var delay = 1000;


// ユーザ設定
var config = {
	__proto__:			sb_info,					// デフォルト設定（継承する）
//	hidden_component:	null,
//	sidebar_inserts:	['your-activity'],			// サイドバーの挿入位置
//	updateInterval:		60,							// 更新インターバル（秒）
//	showModtime:		true,						// 更新時間の表示
//	lang:				'en',						// 言語（'ja' or 'en'）
//	num:				10,							// 表示数
//	style:				'list',						// 表示スタイル（'cloud', 'list', or null）
};


if (document.getElementById(__FILE__))
{
	window[config.callback] = function (json) { sb_update_json(json, config) };
}
else
{
	// インターバルタイマーのＩＤ
	var sb_timer = null;
	// 更新関数
	var sb_update;

	function side_buzztter()
	{
		if (sb_timer)
		{	// インターバルタイマーがあればクリアする
			clearInterval(sb_timer);
			sb_timer = null;
		}

		var dashboards = document.getElementsByClassName('dashboard');
		if (0 < dashboards.length)
		{	// class 'dashboard' がある場合のみ実行

			// コンポーネントを非表示にする
			if (config.hidden_component)
			{
				for (var key in config.hidden_component)
				{
					hidden_dashboard_component(config.hidden_component[key], delay, try_count);
				}
			}

			if (! sb_config_init(config))
			{	// サイドバーの挿入位置がみつからない
				return false;
			}

			// 更新関数の定義
			sb_update = create_update_fn(config);
			// 呼出し
			sb_update();

			// 実行完了
			return true;
		}

		// 実行できなかった
		return false;
	}

	dashboard_component(side_buzztter, delay, try_count);

	// URIの変更を監視する
	var current_location = window.location + '';
	setInterval(function() {
		if (current_location != window.location)
		{
			current_location = window.location + '';
			dashboard_component(side_buzztter, delay, try_count);
		}
	}, 5000);
}


function create_update_fn(config)
{
	// メニューの取得
	var menu = sb_get_menu(config);
	add_class(menu, 'loading');

	// 秒をミリ秒に変換
	var updateInterval = 1000 * config.updateInterval;
	// 更新日
	var last_update = null;

	if (typeof GM_xmlhttpRequest === 'undefined')
	{   // GreaseKit など GM関数のない環境では JSONP を使用してクロスドメインのデータを取得する
		var url = str_expand(config.jsonp_url, config);

		// JSONPのコールバックをグローバルに作成
		set_global(config.callback,
			function(json) { sb_update_json(json, config) });

		var s = null;
		function onerror(e)
		{
			sb_show_error(e.toString(), config);
		}

		var update_fn = function()
		{
			add_class(menu, 'loading');
			s = jsonp(url, s, onerror);
			last_update = new Date();
		}
	}
	else
	{	// GM関数のある環境（Firefox の Greasemonkey）
		var url = str_expand(config.url, config);

		var update_fn = function()
		{
			add_class(menu, 'loading');
			sb_update_rss(url, config);
			last_update = new Date();
		}
	}

	return function()
	{
		try {

			if (! last_update || 1000 * 30 < diff_time(last_update))
			{	// 初回または前回よりも30秒以上たっていれば実行する
				update_fn();
			}

			sb_timer = setInterval(update_fn, updateInterval);

		} catch(e) {
			sb_show_error(e, config);
		}
	}
}


//--------------------

function dashboard_component(func, delay, try_count)
{
	function component()
	{
		if (! func())
		{	// 実行できなかった
			if (try_count--)
			{	// try_count だけ再チャレンジ
				setTimeout(component, delay);
			}
		}
	}

	component();
}


function hidden_dashboard_component(className, delay, try_count)
{
	function hidden_component()
	{
		var inner = document.getElementsByClassName(className);

		if (0 < inner.length)
		{
			var node = inner[0].parentNode;
			node.style.display = 'none';
			return true;
		}

		return false;
	}

	dashboard_component(hidden_component, delay, try_count);
}


//--------------------

// ローカルストレージからデータを取出す
function get_local_storage(name)
{
	if (typeof localStorage != 'undefined')
		return localStorage.getItem(name);
	else if (typeof GM_getValue != 'undefined')
		return GM_getValue(name, null);
	else
		return null;
}


// ローカルストレージにデータを格納する
function set_local_storage(name, value)
{
	if (typeof localStorage != 'undefined')
		localStorage.setItem(name, value);
	else if (typeof GM_getValue != 'undefined')
		GM_setValue(name, value);
}


// グローバルに定義する
function set_global(key, value)
{
	if (typeof unsafeWindow != 'undefined')
	{	// Greasemonkey の場合
		unsafeWindow[key] = value;
	}
	else if (typeof safari != 'undefined')
	{
		if (document.getElementById(__FILE__))
			return;

		var h = document.getElementsByTagName('head')[0];
		var s = script(safari.extension.baseURI+__FILE__);
//		var s = script(safari.extension.baseURI+'empty.js');
		s.setAttribute('id', __FILE__);

//		s.addEventListener('load', function() { eval('window')[key] = value; }, false);

		// ヘッダに追加する
		h.appendChild(s);
	}
	else
	{
		window[key] = value;
	}
}


// 文字列に含まれる $VAR or $(VAR) を連想配列の値で展開する
function str_expand(str, vars)
{
	return str.replace(/\$(([A-z_]+)|\(([A-z_]+)\))/g,
				function(m, m1, m2, m3)
				{
					var key = m2?m2:m3;
					var v = vars[key];

					if (typeof v == 'undefined')
						return m;
					else
						return v;
				}
			);
}


// d2 - d1 の差分を計算する
function diff_time(d1, d2)
{
	if (! d2)
		d2 = new Date();

	return d2.getTime() - d1.getTime();
}


// クラス名で指定された要素を削除する
function remove_by_class_name(parent, className)
{
	var elements = parent.getElementsByClassName(className);

	for (var i = 0; i < elements.length; i++)
	{
		parent.removeChild(elements[i]);
	}
}


// クラスをトグルさせる
function toggle_class(e, className)
{
	var klass = e.getAttribute('class');
	var c = klass?klass.split(' '):[];
	var i = c.indexOf(className);

	if (i == -1)
		c.push(className);
	else
		c.splice(i, 1);

	e.setAttribute('class', c.join(' '));

	return (i == -1);
}


// クラスを追加する
function add_class(e, className)
{
	var klass = e.getAttribute('class');
	var c = klass?klass.split(' '):[];
	var i = c.indexOf(className);
	
	if (i == -1)
		c.push(className);
	
	e.setAttribute('class', c.join(' '));
}


// クラスを削除する
function remove_class(e, className)
{
	var klass = e.getAttribute('class');
	var c = klass?klass.split(' '):[];
	var i = c.indexOf(className);
	
	if (i != -1)
		c.splice(i, 1);
	
	e.setAttribute('class', c.join(' '));
}


// span要素を作成する
function span(text, klass)
{
	var e = document.createElement('span');

	e.innerHTML = text;
	if (klass) e.setAttribute('class', klass);

	return e;
}


// style要素を作成する
function style(obj)
{
	var e = document.createElement('style');

	e.setAttribute('type', 'text/css');

	if ((typeof obj == 'object') && (obj instanceof Array))
		obj = obj.join(' ');

	try {
		// Firefox の場合
		e.innerHTML = obj;
	} catch(err) {
		// Safari の場合
		e.innerText = obj;
	}

	return e;
}


// script要素を作成する
function script(url)
{
	var s = document.createElement('script');

	s.setAttribute('type', 'text/javascript');
	if (url) s.setAttribute('src', url);
	s.setAttribute('charset', 'UTF-8');

	return s;
}


// JSONP をヘッダに追加する
function jsonp(url, old, onerror)
{
	var h = document.getElementsByTagName('head')[0];
	var s = script(url + time_str('&ymdHMS'));	// GreaseKit でうまく再ロードされないので URL に日時を追加する

	if (onerror) s.onerror = onerror;

	// ヘッダに追加する
	h.appendChild(s);

	try {
		// 古いのは削除しておく
		if (old) h.removeChild(old);
	} catch(e) {
	}

	return s;
}


// 日時を簡易フォーマットで文字列化
function time_str(format, date)
{
	if (! date)
		date = new Date()

	var t = format;
	var d = {
		y: date.getFullYear(),
		m: date.getMonth() + 1,
		d: date.getDate(),
		H: date.getHours(),
		M: date.getMinutes(),
		S: date.getSeconds(),
	};

	for (var key in d)
	{
		var n = d[key].toString();

		while (n.length < 2)
		{
			n = '0' + n;
		}

		t = t.replace(key, n);
	}

    return t;
}


//--------------------

// デバッグ用にエラー内容を表示する
function sb_show_error(e, config)
{
	var menu = sb_get_menu(config);
	var klass = 'sb-message';

	remove_class(menu, 'loading');
	remove_by_class_name(menu, klass);

	if (e)
	{
		var hr = menu.getElementsByTagName('hr')[0];
		menu.insertBefore(span(e, klass), hr);
	}
}


// config の初期化
function sb_config_init(config)
{
	for (var i in config.sidebar_inserts)
	{
		var klass = config.sidebar_inserts[i];

		var f = document.getElementsByClassName(klass);
		if (0 < f.length)
		{
			config.sidebar_insert_pos = klass;
			break;
		}
	}

	if (! config.sidebar_insert_pos)
	{	// サイドバーの挿入位置がみつからない
		return false;
	}

	if (! config.lang)
	{
		try {
			config.lang = navigator.language.substr(0, 2);
		} catch(e) {
			config.lang = 'ja';	// デフォルト言語は 'ja'
		}
	}

	return true;
}


// メニューを返す
function sb_get_menu(config)
{
	var m = document.getElementById(config.id);
	if (m)
	{	// 既にメニューがつくられている場合はそれを返す
		return m;
	}

	// メニューを作成してサイドバーに挿入する
	m = sb_insert_side(config.sidebar_insert_pos, sb_create_menu(config));

	return m;
}


// メニューをサイドバーに挿入する
function sb_insert_side(insert_pos, menu)
{
	var dashboards = document.getElementsByClassName('dashboard');
	if (dashboards.length == 0) return null;
	var side = dashboards[0];

	var f = document.getElementsByClassName(insert_pos);
	if (f.length == 0) return null;
	var nextElement = f[0].parentNode.nextSibling;

	while ((typeof nextElement.tagName == 'undefined')
			|| (nextElement.tagName == 'HR'))
	{
		nextElement = nextElement.nextSibling;
	}

	side.insertBefore(menu, nextElement);

	return menu;
}


// メニューのタイトル要素を作成する
function sb_create_title(config, listener)
{
	var title = document.createElement('h2');
	var linkover = false;
	
	title.innerHTML = config.title;
	
	if (listener)
	{	// アンカータグの上でクリックされていないときのみ実行する
		title.addEventListener('click', function() { if (! linkover) listener() }, false);
	}

	if (config.link)
	{
		title.innerHTML = title.innerHTML + ' ';

		var link = document.createElement('a');
		link.setAttribute('href', config.link);
		link.setAttribute('target', '_blank');
		link.appendChild(span('go'));

		// アンカータグの上でクリックされたときに他の動作が実行されないようにするためにフラグをセットする
		link.addEventListener('mouseover', function() { linkover = true }, false);
		link.addEventListener('mouseout', function() { linkover = false }, false);

		title.appendChild(link);
	}

    return title;
}


// リスト要素を作成する
function sb_create_list(config)
{
	var list = document.createElement('ul');
	var classes = ['sidebar-menu'];

	classes.push(config.id + '-links');

	list.setAttribute('class', classes.join(' '));

	return list;
}


// メニュー要素を作成する
function sb_create_menu(config, collapsed)
{
	var menu = document.createElement('div');
	var inner = document.createElement('div');
	var classes = ['component', 'collapsible'];
	if (collapsed) classes.push('collapsed');

	if (config.style == 'cloud')
	{	// 表示スタイルがクラウドの場合
		classes.push('cloud');
	}

	inner.setAttribute('class', config.id + '-inner');
	inner.appendChild(style('#' + config.id + ' span.sb-message { display:inline-block; padding-left:14px; }'));

	if (config.styles)
		inner.appendChild(style(config.styles));

	menu.setAttribute('class', classes.join(' '));
	menu.setAttribute('id', config.id);
	menu.appendChild(inner);

	// 表示・非表示をトグルさせる
	function toggleCollapse()
	{
		if (toggle_class(menu, 'collapsed'))
		{
			if (sb_timer)
			{	// インターバルタイマーがあればクリアする
				clearInterval(sb_timer);
				sb_timer = null;
			}
		}
		else
		{	// 更新する
			sb_update();
		}
	}

 	inner.appendChild(sb_create_title(config, toggleCollapse));
	inner.appendChild(sb_create_list(config));

	var hr = document.createElement('hr');
	hr.setAttribute('class', 'component-spacer');
	menu.appendChild(hr);

	return menu;
}


// リストのアイテム作成
function sb_create_item(text, url, hook)
{
	// li要素の作成
	var item = document.createElement('li');
	item.setAttribute('class', 'link-title');

	var e = span(text);
	if (hook) hook(e);

	if (url)
	{
		// link要素の作成
		var link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('target', '_blank');
		link.appendChild(e);

		// link要素の追加
		item.appendChild(link);
	}
	else
	{
		item.appendChild(e);
	}

	return item;
}


// 古いリストと置換える
function sb_replace_list(list, config)
{
	// 古いリストと置換える
	var menu = sb_get_menu(config);
	var inner = menu.getElementsByClassName(config.id + '-inner')[0];
	inner.replaceChild(list, inner.getElementsByTagName('ul')[0]);

	// 正常終了
	sb_show_error(null, config);

	if (config.showModtime)
	{   // 更新時間を表示する
		var title = menu.getElementsByClassName('sidebar-title')[0];
		var klass = 'sb-moddate';

		remove_by_class_name(title, klass);
		title.appendChild(span(time_str(' (H:M)'), klass));
	}
}


// RSS を表示する（JSON用）
function sb_update_json(json, config)
{
	try {
		if (json.count == 0)
		{	// リストが空の場合
			sb_show_error('(Service unavailable?)', config);
			return;
		}

		var list = sb_create_list(config);
		var items = json.value.items;
		var show_item = ['title'];

		if (config.show_item)
			show_item = config.show_item;

		for (var i in items)
		{
			var	elmt = null;

			if (config.num <= i) break;

			for (var j in show_item)
			{
				var text = items[i][show_item[j]];
				if (! text) continue;

				if (elmt == null)
					elmt = list.appendChild(sb_create_item(text, items[i].link, config.item_hook));
				else
					elmt.appendChild(span(text));
			}
		}

		// 古いリストと置換える
		sb_replace_list(list, config);
	} catch(e) {
		sb_show_error(e, config);
	}
}


// RSS を表示する（xmlhttpRequest用）
function sb_update_rss(url, config)
{
	// RSS の読込み
	function sb_load_rss(res)
	{
		try {
			// ノードの取得
			function get_node(item, tag)
			{
				return item.getElementsByTagName(tag)[0].firstChild.nodeValue;
			}

			if (res.readyState == 4 && res.status == 200)
			{	// RSS の受信に成功した
				var list = sb_create_list(config);

				// GM_xmlhttpRequest では responseXML が使えないのでその対策
				if (! res.responseXML)
					res.responseXML = new DOMParser().parseFromString(res.responseText, "text/xml");

				// RSS からリストを作成
				var rss = res.responseXML;
				var items = rss.getElementsByTagName('item');
				var show_item = ['title'];

				if (config.show_item)
					show_item = config.show_item;

				for (var i in items)
				{
					if (config.num <= i) break;

					var item = items[i];
					var elmt = null;

					for (var j in show_item)
					{
						var text = get_node(item, show_item[j]);
						if (! text) continue;

						if (elmt == null)
						{
							var link = get_node(item, 'link');
							elmt = list.appendChild(sb_create_item(text, link, config.item_hook));
						}
						else
						{
							elmt.appendChild(span(text));
						}
					}
				}

				// 古いリストと置換える
				sb_replace_list(list, config);
			}

			if (res.status != 200)
			{
				var error_messages = {
					500: 'Internal server error',
					501: 'Not implemented',
					502: 'Bad gateway',
					503: 'Service unavailable',
					504: 'Gateway timeout',
					505: 'HTTP version not supported',
				};
				var msg = error_messages[res.status];
				if (! msg) msg = 'err=' + res.status;
				sb_show_error('(' + msg + ')', config);
			}

		} catch(e) {
			sb_show_error(e, config);
		}
	}

	// エラー処理
	function sb_onerror(e)
	{
		sb_show_error(e.toString(), config);
	}

	try {
		if (typeof GM_xmlhttpRequest === 'undefined')
		{	// XMLHttpRequest はクロスドメインでは使えないので実際にはここは使われない
			var req = new XMLHttpRequest();

			req.onreadystatechange = function() { sb_load_rss(req) };
			req.onerro = sb_onerror;
			req.open('GET', url, true);
			req.send(null);
		}
		else
		{
			GM_xmlhttpRequest({method:'GET', url:url, onload:sb_load_rss, onerror:sb_onerror});
		}
	} catch(e) {
		sb_show_error(e, config);
	}
}

})();
