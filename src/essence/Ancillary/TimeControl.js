// TimeControl sets up a div that displays the time controller
import * as d3 from 'd3'
import * as moment from 'moment'
import $ from 'jquery'
import L_ from '../Basics/Layers_/Layers_'
import Map_ from '../Basics/Map_/Map_'

import './TimeControl.css'

// Can be either hh:mm:ss or just seconds
const relativeTimeFormat = new RegExp(
    /((?:-?\d*):(?:[0-5]\d):(?:[0-5]\d))|(?:\d*)/
)

var TimeControl = {
    isRelative: true,
    currentTime: new Date().toISOString().split('.')[0] + 'Z',
    timeOffset: '01:00:00',
    startTime: new Date().toISOString().split('.')[0] + 'Z',
    endTime: new Date().toISOString().split('.')[0] + 'Z',
    relativeStartTime: '01:00:00',
    relativeEndTime: '00:00:00',
    globalTimeFormat: null,
    init: function () {
        if (L_.configData.time && L_.configData.time.enabled === true) {
            TimeControl.globalTimeFormat = d3.utcFormat(
                L_.configData.time.format
            )
        } else {
            $('#toggleTimeUI').css({ display: 'none' })
            $('#CoordinatesDiv').css({ marginRight: '0px' })
            return
        }

        // prettier-ignore
        const markup = [
                "<label id='currentTimeLabel'></label>",
                
                "<label id='startTimeLabel'>Start:</label>",
                `<input id='startTimeInput' value='${this.startTime}'></input>`,

                "<label id='endTimeLabel'>End:</label>",
                `<input id='endTimeInput' value='${this.endTime}'></input>`,
                
                "<label id='offsetTime'>Offset:</label>",
                `<input id='offsetTimeInput' value='${this.timeOffset}'></input>`,

                `<input id='isRelativeTime' type='checkbox' ${this.isRelative ? 'checked' : ''}></input>`,
                "<label id='isRelativeTimeLabel'>Relative Time</label>",

                "<label id='startRelativeTime'>Start: -</label>",
                `<input id='startRelativeTimeInput' value='${this.relativeStartTime}'></input>`,

                "<label id='endRelativeTime'>End: +</label>",
                `<input id='endRelativeTimeInput' value='${this.relativeEndTime}'></input>`,
            ].join('\n');

        d3.select('body')
            .append('div')
            .attr('id', 'timeUI')
            .attr('class', 'center aligned ui padded grid')
            .html(markup)

        d3.select('#offsetTimeInput').on('change', timeInputChange)
        d3.select('#startTimeInput').on('change', timeInputChange)
        d3.select('#endTimeInput').on('change', timeInputChange)
        d3.select('#startRelativeTimeInput').on('change', timeInputChange)
        d3.select('#endRelativeTimeInput').on('change', timeInputChange)

        updateTime()
        if (L_.configData.time.visible == false) {
            TimeControl.toggleTimeUI(false)
        }
    },
    toggleTimeUI: function (isOn) {
        d3.select('#timeUI').style('visibility', function () {
            return isOn === true ? 'visible' : 'hidden'
        })
        return isOn
    },
    setTime: function (
        startTime,
        endTime,
        isRelative,
        timeOffset = '00:00:00'
    ) {
        var now = new Date()
        var offset = 0
        if (relativeTimeFormat.test(timeOffset)) {
            offset = parseTime(timeOffset)
        } else {
            // assume seconds otherwise
            offset = parseInt(timeOffset)
        }
        d3.select('#offsetTimeInput').property('value', timeOffset)
        var currentTime = new moment(now).add(offset, 'seconds')
        d3.select('#currentTimeLabel').text(
            TimeControl.globalTimeFormat(currentTime)
        )
        TimeControl.currentTime =
            currentTime.toDate().toISOString().split('.')[0] + 'Z'

        d3.select('#isRelativeTime').property('checked', isRelative)
        if (isRelative == true) {
            d3.select('#startRelativeTimeInput').property('value', startTime)
            d3.select('#endRelativeTimeInput').property('value', endTime)

            var start = parseTime(startTime)
            var end = parseTime(endTime)
            var startTimeM = new moment(currentTime).subtract(start, 'seconds')
            var endTimeM = new moment(currentTime).add(end, 'seconds')

            d3.select('#startTimeInput').property(
                'value',
                startTimeM.toISOString().split('.')[0] + 'Z'
            )
            d3.select('#endTimeInput').property(
                'value',
                endTimeM.toISOString().split('.')[0] + 'Z'
            )
        } else {
            var startTimeD = new Date(startTime)
            var endTimeD = new Date(endTime)
            d3.select('#startTimeInput').property(
                'value',
                startTimeD.toISOString().split('.')[0] + 'Z'
            )
            d3.select('#endTimeInput').property(
                'value',
                endTimeD.toISOString().split('.')[0] + 'Z'
            )
        }
        TimeControl.startTime = d3.select('#startTimeInput').property('value')
        TimeControl.endTime = d3.select('#endTimeInput').property('value')
        TimeControl.updateLayersTime()
        return true
    },
    setLayerTime: function (layer, startTime, endTime) {
        if (typeof layer == 'string') {
            layer = L_.layersNamed[layer]
        }
        if (layer.time && layer.time.enabled == true) {
            layer.time.start = startTime
            layer.time.end = endTime
            d3.select('.starttime.' + layer.name.replace(/\s/g, '')).text(
                layer.time.start
            )
            d3.select('.endtime.' + layer.name.replace(/\s/g, '')).text(
                layer.time.end
            )
        }
        return true
    },
    getTime: function () {
        return TimeControl.currentTime
    },
    getStartTime: function () {
        return TimeControl.startTime
    },
    getEndTime: function () {
        return TimeControl.endTime
    },
    getLayerStartTime: function (layer) {
        if (typeof layer == 'string') {
            layer = L_.layersNamed[layer]
        }
        if (layer.time) return layer.time.start
        return false
    },
    getLayerEndTime: function (layer) {
        if (typeof layer == 'string') {
            layer = L_.layersNamed[layer]
        }
        if (layer.time) return layer.time.end
        return false
    },
    reloadLayer: function (layer) {
        // reload layer
        if (typeof layer == 'string') {
            layer = L_.layersNamed[layer]
        }
        console.log('Reloading ' + layer.name)
        if (layer.time && layer.time.enabled == true) {
            var layerTimeFormat = d3.utcFormat(layer.time.format)
            layer.time.current = TimeControl.currentTime // keeps track of when layer was refreshed
            if (layer.type == 'tile') {
                if (
                    typeof L_.layersGroup[layer.name].wmsParams !== 'undefined'
                ) {
                    L_.layersGroup[layer.name].wmsParams.TIME = layerTimeFormat(
                        Date.parse(layer.time.end)
                    )
                    L_.layersGroup[layer.name].wmsParams.STARTTIME =
                        layerTimeFormat(Date.parse(layer.time.start))
                    L_.layersGroup[layer.name].wmsParams.ENDTIME =
                        layerTimeFormat(Date.parse(layer.time.end))
                }
                L_.layersGroup[layer.name].options.time = layerTimeFormat(
                    Date.parse(layer.time.end)
                )
                L_.layersGroup[layer.name].options.starttime = layerTimeFormat(
                    Date.parse(layer.time.start)
                )
                L_.layersGroup[layer.name].options.endtime = layerTimeFormat(
                    Date.parse(layer.time.end)
                )
                L_.toggleLayer(layer)
                L_.toggleLayer(layer)
            } else {
                // replace start/endtime keywords
                var originalUrl = layer.url
                layer.url = layer.url
                    .replace(
                        '{starttime}',
                        layerTimeFormat(Date.parse(layer.time.start))
                    )
                    .replace(
                        '{endtime}',
                        layerTimeFormat(Date.parse(layer.time.end))
                    )
                // refresh map
                Map_.refreshLayer(layer)
                // put start/endtime keywords back
                layer.url = originalUrl
            }
        }

        return true
    },
    reloadTimeLayers: function () {
        // refresh time enabled layers
        var reloadedLayers = []
        for (let layerName in L_.layersNamed) {
            const layer = L_.layersNamed[layerName]
            if (layer.time && layer.time.enabled == true) {
                TimeControl.reloadLayer(layer)
                reloadedLayers.push(layer.name)
            }
        }
        return reloadedLayers
    },
    updateLayersTime: function () {
        var updatedLayers = []
        for (let layerName in L_.layersNamed) {
            const layer = L_.layersNamed[layerName]
            if (
                layer.time &&
                layer.time.enabled == true &&
                layer.time.type == 'global'
            ) {
                layer.time.start = TimeControl.startTime
                layer.time.end = TimeControl.endTime
                d3.select('.starttime.' + layer.name.replace(/\s/g, '')).text(
                    layer.time.start
                )
                d3.select('.endtime.' + layer.name.replace(/\s/g, '')).text(
                    layer.time.end
                )
                updatedLayers.push(layer.name)
            }
        }
        return updatedLayers
    },
    setLayerTimeStatus: function (layer, color) {
        if (typeof layer == 'string') {
            layer = L_.layersNamed[layer]
        }
        if (layer.time) {
            layer.time.status = color
            d3.select('#timesettings' + layer.name.replace(/\s/g, '')).style(
                'color',
                layer.time.status
            )
        }
        return true
    },
    setLayersTimeStatus: function (color) {
        var updatedLayers = []
        for (let layerName in L_.layersNamed) {
            const layer = L_.layersNamed[layerName]
            if (
                layer.time &&
                layer.time.enabled == true &&
                layer.time.type == 'global'
            ) {
                TimeControl.setLayerTimeStatus(layer, color)
                updatedLayers.push(layer.name)
            }
        }
        return updatedLayers
    },
}

function updateTime() {
    // Continuously update global time clock and UI elements
    var now = new Date()
    var offset = 0
    var offsetTime = d3.select('#offsetTimeInput').property('value')
    if (relativeTimeFormat.test(offsetTime)) {
        offset = parseTime(offsetTime)
    }
    var currentTime = new moment(now).add(offset, 'seconds')
    d3.select('#currentTimeLabel').text(
        TimeControl.globalTimeFormat(currentTime)
    )
    TimeControl.currentTime =
        currentTime.toDate().toISOString().split('.')[0] + 'Z'

    if (d3.select('#isRelativeTime').property('checked') == true) {
        var start = parseTime(
            d3.select('#startRelativeTimeInput').property('value')
        )
        var end = parseTime(
            d3.select('#endRelativeTimeInput').property('value')
        )
        var startTime = new moment(currentTime).subtract(start, 'seconds')
        var endTime = new moment(currentTime).add(end, 'seconds')

        TimeControl.startTime =
            startTime.toDate().toISOString().split('.')[0] + 'Z'
        TimeControl.endTime = endTime.toDate().toISOString().split('.')[0] + 'Z'

        d3.select('#startTimeInput').property(
            'value',
            startTime.toISOString().split('.')[0] + 'Z'
        )
        d3.select('#endTimeInput').property(
            'value',
            endTime.toISOString().split('.')[0] + 'Z'
        )
    }
    setTimeout(updateTime, 100)
}

function timeInputChange() {
    // Validate time format
    var timeInput = d3.select(this).property('value')
    if (relativeTimeFormat.test(timeInput)) {
        d3.select(this).style('background-color', '#ffffff')
    } else {
        d3.select(this).style('background-color', '#ff0000')
    }

    TimeControl.startTime = d3.select('#startTimeInput').property('value')
    TimeControl.endTime = d3.select('#endTimeInput').property('value')

    // Update layer times and reload
    TimeControl.updateLayersTime()
    TimeControl.reloadTimeLayers()
}

function parseTime(t) {
    if (t.toString().indexOf(':') == -1) {
        return parseInt(t)
    }
    var s = t.split(':')
    var seconds = +s[0].replace('-', '') * 60 * 60 + +s[1] * 60 + +s[2]
    if (t.charAt(0) === '-') {
        seconds = seconds * -1
    }
    return seconds
}

function formatTimeString(seconds) {
    // converts seconds to hh:mm:ss
    if (typeof seconds === 'undefined') {
        return '00:00:00'
    }
    var t = Math.abs(seconds)
    var days = Math.floor(t / 86400)
    var dt = new Date(t * 1000)
    var dtString = dt.toISOString().substr(11, 8)
    var s = dtString.split(':')
    var hours = +s[0] + days * 24
    return (seconds < 0 ? '-' : '') + hours + ':' + s[1] + ':' + s[2]
}

export default TimeControl
