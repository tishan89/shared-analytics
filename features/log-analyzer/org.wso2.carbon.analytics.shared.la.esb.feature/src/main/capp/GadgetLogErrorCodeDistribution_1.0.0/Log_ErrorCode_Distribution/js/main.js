/*
 * Copyright (c) 2016, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */


var chart;
var from = gadgetUtil.timeFrom();
var to = gadgetUtil.timeTo();
var async_tasks = gadgetConfig.errorType.length;
var receivedData = [];
var initState = true;
var meta = gadgetConfig.meta;
var configChart = gadgetConfig.chartConfig;
var canvasDiv = "#canvas";
var prefs = new gadgets.Prefs();
var svrUrl = gadgetUtil.getGadgetSvrUrl("ESB");
var client = new AnalyticsClient().init(null,null,svrUrl);

function initialize() {
    fetch();
}

$(document).ready(function () {
    initialize();
});

function fetch(logLevelIndex) {
    if (!logLevelIndex) {
        receivedData.length = 0;
        logLevelIndex = 0;
    }
    var queryInfo = {
        tableName: gadgetConfig.datasource,
        searchParams: {
            query: "ErrorType:\"" + gadgetConfig.errorType[logLevelIndex] + "\" AND  _timestamp: [" + from + " TO " + to + "]"
        }
    };

    client.searchCount(queryInfo, function (d) {
        if (d["status"] === "success") {
            receivedData.push([gadgetConfig.errorType[logLevelIndex], parseInt(d["message"])]);
            async_tasks--;
            if (async_tasks == 0) {
                if (!initState) {
                    redrawLogLevelChart();
                } else {
                    drawLogLevelChart();
                    initState = false;
                }
            } else {
                fetch(++logLevelIndex);
            }
        }
    }, function (error) {
        if(error === undefined){
            onErrorCustom("Analytics server not found.", "Please troubleshoot connection problems.");
            console.log("Analytics server not found : Please troubleshoot connection problems.");
        }else{
            error.message = "Internal server error while data indexing.";
            onError(error);
            console.log(error);
        }
    });
}

function drawLogLevelChart() {
    var maxValue = getMaximumValue(receivedData);
    if(maxValue < 10){
      configChart.yTicks = maxValue;
    }

    try {
        $(canvasDiv).empty();
        chart = new vizg(
            [
                {
                    "metadata": this.meta,
                    "data": receivedData
                }
            ],
            configChart
        );
        chart.draw(canvasDiv);
    } catch (error) {
        console.log(error);
        error.message = "Error while drawing log event chart.";
        error.status = "";
        onError(error);
    }
}

function getMaximumValue(receivedData){
    var max = 0;
    for(var i=0;i<receivedData.length;i++){
        if(receivedData[i][1] > max){
            max = receivedData[i][1];
        }
    }
    return max;
}

function redrawLogLevelChart() {
    for (var i in receivedData) {
        chart.insert([receivedData[i]]);
    }
}

function subscribe(callback) {
    gadgets.HubSettings.onConnect = function () {
        gadgets.Hub.subscribe("subscriber", function (topic, data, subscriber) {
            callback(topic, data, subscriber)
        });
    };
}

subscribe(function (topic, data, subscriber) {
    from = parseInt(data["timeFrom"]);
    to = parseInt(data["timeTo"]);
    async_tasks = gadgetConfig.level.length;
    fetch();
});

function onError(msg) {
    $(canvasDiv).html(gadgetUtil.getErrorText(msg));
}


function onErrorCustom(title, message) {
    $(canvasDiv).html(gadgetUtil.getCustemText(title, message));
}