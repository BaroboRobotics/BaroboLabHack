# This is disgusting, but I literally copied and pasted explore.coffee in
# here. Hack demo. I pray I never see this code after next week.

robots = [redRobot, blueRobot]

rand = (min, max) ->
    Math.floor(Math.random() * (max - min) + min)

angular.module('challenge', [])
    .directive('eqnGraph', ->
        compile: (element, attrs) ->
            element.css(
                width: '400px'
                height: '400px'
            )

            (scope, element, attrs) ->
                scope.$watchCollection(
                    "[#{attrs.eqnConfig}, #{attrs.eqnData}]"
                    ([cfg, data]) ->
                            $.plot(element, data, cfg)
                )


    )
    .filter('plusMinus', ->
        (x, unary = false) ->
            x_ = Math.abs(x)
            if x >= 0
                if unary or x == 0
                    x
                else
                    "+ #{x_}"
            else # < 0
                if unary
                    "-#{x_}"
                else
                    "- #{x_}"
    )
    .controller('Challenge', ($scope) ->
        $scope.mockRobot = Robot.mock? && Robot.mock
        $scope.solnX = rand(-10,10)
        $scope.solnY = rand(-10,10)
    )
    .controller('StandardEqns', ($scope) ->
        $scope.selected = [0,0]

        [
            $scope.x1
            $scope.y1
            $scope.z1
            $scope.x2
            $scope.y2
            $scope.z2
        ] = (rand(-10, 10) for x in [0..5])

        $scope.a1 = $scope.a2 = $scope.b1 = $scope.b2 = 0

        $scope.$watch(
            ->
                [$scope.x1, $scope.y1, $scope.z1,
                 $scope.x2, $scope.y2, $scope.z2]
            ->
                $scope.a1 = -$scope.x1/$scope.y1
                $scope.b1 =  $scope.z1/$scope.y1
                $scope.a2 = -$scope.x2/$scope.y2
                $scope.b2 =  $scope.z2/$scope.y2
            true
        )

        $scope.changeSelected = (robot, left) ->
            $scope.$apply(->
                if left
                    if $scope.selected[robot] > 0
                        $scope.selected[robot] -= 1
                else
                    if $scope.selected[robot] < 2
                        $scope.selected[robot] += 1
            )
        $scope.incrementSelected = (robot, up) ->
            $scope.$apply(->
                sel = $scope.selected[robot]
                # Blerg
                idx = robot + 1
                coefficient = (
                    if sel == 0
                        "x"
                    else if sel == 1
                        "y"
                    else
                        "z"
                ) + idx

                if up
                    $scope[coefficient] += 1
                else
                    $scope[coefficient] -= 1
            )
    )
    .controller('InterceptEqns', ($scope) ->
        [
            $scope.a1
            $scope.b1
            $scope.a2
            $scope.b2
        ] = (rand(-10, 10) for x in [0..3])

        $scope.selected = [0,0]
        $scope.changeSelected = (robot, left) ->
            $scope.$apply(->
                if left
                    if $scope.selected[robot] > 0
                        $scope.selected[robot] -= 1
                else
                    if $scope.selected[robot] < 1
                        $scope.selected[robot] += 1
            )
        $scope.incrementSelected = (robot, up) ->
            $scope.$apply(->
                sel = $scope.selected[robot]
                # Blerg
                idx = robot + 1
                coefficient = (
                    if sel == 0
                        "a"
                    else if sel == 1
                        "b"
                ) + idx

                if up
                    $scope[coefficient] += 1
                else
                    $scope[coefficient] -= 1
            )
    )
    .controller('Graph', ($scope, $element) ->
        $scope.chartCfg = chartCfg = {
            grid: {
                markings: [
                    {
                      linewidth: 1
                      yaxis: { from: 0, to: 0 }
                      color: "#8A8A8A"
                    }
                    {
                      linewidth: 1
                      xaxis: { from: 0, to: 0 }
                      color: "#8A8A8A"
                    }
                ],
            },
            xaxis: {
              min: -10,
              max: 10,
              tickSize: 2,
              tickDecimals: 0,
            },
            yaxis: {
              min: -10,
              max: 10,
              tickSize: 2,
              tickDecimals: 0,
            },
            colors: ["black", "red", "blue"]
        }

        mkSeries = (a1, b1, a2, b2, solnX, solnY) ->
            s = for [a, b] in [[a1, b1],
                               [a2, b2]]
                    for x in [-10, 10]
                        [x, a*x + b]
            s.unshift({
                data: [[solnX, solnY]]
                points: {show: true}
            })
            s

        $scope.serieses = mkSeries($scope.a1, $scope.b1, $scope.a2
                                  ,$scope.b2, $scope.solnX, $scope.solnY)
        $scope.$watch(
            -> [ $scope.a1, $scope.b1 ,
                 $scope.a2, $scope.b2 ,
                 $scope.solnX, $scope.solnY ]
            ([a1, b1, a2, b2, solnX, solnY]) ->
                $scope.serieses = mkSeries(a1, b1, a2 ,b2, solnX, solnY)
            true
        )
    )

##
## Set up mock robot if necessary
##

Robot =
    if Robot?
        Robot
    else
        rb = { mock: true }
        (rb[x] = ->) for x in [
            "connectRobot",
            "disconnectRobot",
            "getRobotIDList",
            "moveNB",
            "printMessage",
            "setColorRGB",
            "setJointSpeeds",
            "stop",
        ]
        (rb[event] = { connect: -> }) for event in [
            "scrollUp"
            "scrollDown"
            "buttonChanged"
        ]

        rb


##
## Bracket robot connections.
##

$(->
    Robot.connectRobot(x) for x in robots
    Robot.setColorRGB(robots[0], 255, 0, 0)
    Robot.setColorRGB(robots[1], 0, 0, 255)
)

Robot.buttonChanged.connect((id, btn) ->
    activeTab = $(".tab-pane.active")

    activeTab.scope().changeSelected(
        robots.indexOf(id)
        (btn == 0)
    )
)
Robot.scrollDown.connect((id) ->
    activeTab = $(".tab-pane.active")
    activeTab.scope().incrementSelected(
        robots.indexOf(id)
        false
    )
)
Robot.scrollUp.connect((id) ->
    activeTab = $(".tab-pane.active")
    activeTab.scope().incrementSelected(
        robots.indexOf(id)
        true
    )
)
