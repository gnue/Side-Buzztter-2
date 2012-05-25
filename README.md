### 概要

[[Twitter|http://twitter.com/]] のサイドメニューで [[buzztter|http://buzztter.com/ja]] の抽出したトレンドワードを表示できるようにします

* 新UI対応（旧UI非対応）
* Side Buzztter 2 では５分間隔で自動更新するようになっています
* タイトル部をクリックするとリスト部分が非表示になります（折り畳まれます）
* 非表示したときには自動更新されません
* 再度表示したときにはすぐに更新されます（ただし前回更新より30秒未満の場合は更新せず）
* Twitter標準のトレンドは強制的に非表示にします
* buzztter は  [[@darashi|http://twitter.com/darashi]] さんによる Twitter でいま話題のトレンドワードを抽出してくれるとーっても便利なサービスです
* JSONP の生成には  [[Yahoo!Pipes|http://pipes.yahoo.com/pipes/]] を使用しています

### Safari Extension

* [[ダウンロードページ|http://github.com/gnue/Side-Buzztter-2/downloads]]よりダウンロードしてダブルクリックでSafari 5にインストール

### Safari 4/Firefox

* GreaseKit/Greasemonkeyが必要
* ソースから side_buzztter2.user.js の raw を表示してインストール [ [[link|http://github.com/gnue/Side-Buzztter-2/raw/master/Side%20Buzztter%202.safariextension/side_buzztter2.user.js]] ]
