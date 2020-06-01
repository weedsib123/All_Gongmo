var express = require('express');
var http = require('http');
var serveStatic = require('serve-static');      //특정 폴더의 파일들을 특정 패스로 접근할 수 있도록 열어주는 역할
var path = require('path');
var expressSession = require('express-session');
var expressErrorHandler = require('express-error-handler');
var client=require('cheerio-httpcli');
var mongoose = require('mongoose');



var database;
var userSchema;
var infoModel;


//몽고디비 연결 함수
function connectDB() {
    //localhost 로컬 호스트
    //:27017  몽고디비 포트
    //local db 생성시 만든 폴더 명
    var databaseURL = 'mongodb://localhost:27017/test';
    mongoose.Promise = global.Promise;
    mongoose.connect(databaseURL,{ useNewUrlParser: true });
    database = mongoose.connection;     //db와 연결 시도
    database.on('open',         //db 연결 될때의 이벤트
        function () {
            console.log('data base 연결됨 ' + databaseURL);

            //몽구스를 사용하여 스키마에 데이터를 집어넣는다
            //지난 공모전 데이터 저장하는 스키마 구성
            userSchema = mongoose.Schema({
                url:String,//url링크
                image: String,//이미지링크
                title: String,//주제
                boss: String, //주관
            });
            console.log('userSchema 정의함');
            infoModel = mongoose.model('info2', userSchema);
            console.log('infoModel 정의함');
        }
    );
    database.on('disconnected',         //db 연결 끊길떄
        function () {
            console.log('data base 연결 끊어짐');
        }
    );

    database.on('error',         //에러 발생하는 경우
        console.error.bind(console, 'mongoose 연결 에러')
    );



    //DB에 연결한다.
connectDB();

    //지난 공모전 데이터를 db에 저장하는 함수
var addUser = function (db, url,image,title, boss,callback) {
    console.log('add User 호출됨' +image);

    //객체형태로 저장한다.
    var user = new infoModel({ "url":url,"image": image,"title": title,"boss":boss});

    //user 정보를 저장한다.
    user.save
    (
        function (err)
        {
            if (err) {
                callback(err, null);
                return;
            }
            console.log('데이터 추가 됨');
            callback(null, user);
        }
    );

};

/*디비저장*/
//이미지, URL을 덧붙이기 위한 기본값.
var base="https://www.thinkcontest.com";
//지난공모전이 담겨있는 게시판 형식페이지
var url="https://www.thinkcontest.com/Contest/CateField.html?";
var addu="page=";
var adde="&s=end";
//https://www.thinkcontest.com/Contest/CateField.html?page=3&s=end 이런식으로 구성되어 있음
var param={};
for(var i=1;i<6;i++) {
    //page=3 page=4 에 따라 달라지기 때문에 page=까지 데이터를 빼오고 &s=end 데이터를 가져와 사이에 숫자넣어 합친다.
    var url1=url+addu+i+adde;
    //console.log(url1);
    //파싱시작
    client.fetch(url1, param, function (err, $, res) {
        if (err) {
            console.log("client 에러");
            return;
        }
        //html 소스 전체 저장
        var body = $.html();
        //공모전 class 들을 따와서 반복시킨다.
        $(body).find(".contest-title").each(function (idx) {
            if (0 <= idx && idx < 12) {
                //aa에 주소링크를 저장한다.
                var aa = $(this).find("a").attr('href');
                a = base + aa;
                //공모전 데이터 외에 다른 데이터 차단.
                if (a == "https://www.thinkcontest.com/AdsGuide")
                    return;
                //2차 홈페이지에 있는 데이터 접근하기.
                client.fetch(a, param, function (err, $, res) {
                    if (err) {
                        console.log("client 에러" + err);
                        return;
                    }
                    //html 소스 전체저장
                    var body1 = $.html();
                    var body2 = $(body1).find(".contest-detail")
                    //주제파싱해서 저장하기.
                    var tit = $(body2).find(".contest-title").find(".title").text();
                    //이미지 경로 파싱해서 가져오기
                    var img2 = $(body2).find('.poster-holder').attr('style');
                    img2 = img2.substring(22, img2.length - 3);
                    var img3 = base + img2;
                    var body3 = $(body2).find(".type-5");
                    //주관 데이터 저장하기
                    var bos = $(body3).find("tbody").find("tr").first().find("td").text();
                    //url 데이터 저장하기
                    var ur = $(body3).find("tbody").find('.linker').attr('href');

                    //데이터베이스에 지난중인 공모전 정보들 저장하기
                    addUser(database, ur, img3, tit, bos, function (err, result) {
                        if (err) {
                            console.log('Error!!!');
                            return;
                        }
                    })

                })
            }
        });
    });
}