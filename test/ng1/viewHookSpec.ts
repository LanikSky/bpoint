export default "";

describe("view hooks", () => {
  let app, ctrl, $state, $q, $timeout, log = "";
  let component = {
    bindings: { cmpdata: '<' },
    template: '{{$ctrl.cmpdata}}',
  };

  let directive = {
    restrict: 'E',
    scope: { cmpdata: '=' },
    bindToController: true,
    controller: function() {},
    controllerAs: '$ctrl',
    template: '{{$ctrl.cmpdata}}',
  };

  beforeEach(() => {
    app = angular.module('viewhooks', []);
  });

  beforeEach(module(($stateProvider) => {
    ctrl = function controller() {
      this.data = "DATA";
    };

    if (angular.version.minor >= 5) {
      app.component('foo', angular.extend({}, component, {controller: ctrl}));
      app.component('bar', angular.extend({}, component));
      app.component('baz', angular.extend({}, component));
    } else if (angular.version.minor >= 2) {
      app.directive('foo', () => angular.extend({}, directive, {controller: ctrl}));
      app.directive('bar', () => angular.extend({}, directive));
      app.directive('baz', () => angular.extend({}, directive));
    }

    $stateProvider.state({ name: "foo", url: "/foo", component: 'foo' });
    $stateProvider.state({ name: "bar", url: "/bar", component: 'bar' });
    $stateProvider.state({ name: "baz", url: "/baz", component: 'baz' });
  }));

  beforeEach(module('viewhooks', 'ui.router'));

  beforeEach(inject((_$state_, _$q_, _$timeout_, $compile, $rootScope) => {
    $state = _$state_;
    $q = _$q_;
    $timeout = _$timeout_;
    $compile('<div><ui-view></ui-view></div>')($rootScope.$new());
  }));

  describe("uiCanExit", () => {
    beforeEach(() => {
      log = "";
    });

    let initial = () => {
      $state.go('foo'); $q.flush(); $timeout.flush();
      expect(log).toBe('');
      expect($state.current.name).toBe('foo');
    };

    it("can cancel a transition that would exit the view's state by returning false", () => {
      $state.defaultErrorHandler(function() {});
      ctrl.prototype.uiCanExit = function() { log += "canexit;"; return false; };
      initial();

      $state.go('bar'); $q.flush(); $timeout.flush();
      expect(log).toBe('canexit;');
      expect($state.current.name).toBe('foo');
    });

    it("can allow the transition by returning true", () => {
      ctrl.prototype.uiCanExit = function() { log += "canexit;"; return true; };
      initial();

      $state.go('bar'); $q.flush(); $timeout.flush();
      expect(log).toBe('canexit;');
      expect($state.current.name).toBe('bar');
    });

    it("can allow the transition by returning nothing", () => {
      ctrl.prototype.uiCanExit = function() { log += "canexit;"; };
      initial();

      $state.go('bar'); $q.flush(); $timeout.flush();
      expect(log).toBe('canexit;');
      expect($state.current.name).toBe('bar');
    });

    it("can redirect the transition", () => {
      ctrl.prototype.uiCanExit = function(trans) {
        log += "canexit;";
        if (trans.to().name !== 'baz')  {
          return trans.router.stateService.target('baz');
        }
      };
      initial();

      $state.go('bar'); $q.flush(); $timeout.flush();
      expect(log).toBe('canexit;canexit;'); // first: redirects, second: allows the transition
      expect($state.current.name).toBe('baz');
    });

    it("can cancel the transition by returning a rejected promise", inject(($q, $state) => {
      ctrl.prototype.uiCanExit = function() { log += "canexit;"; return $q.reject('nope'); };
      initial();

      $state.defaultErrorHandler(function() {});
      $state.go('bar'); $q.flush(); $timeout.flush();
      expect(log).toBe('canexit;');
      expect($state.current.name).toBe('foo');
    }));

    it("can wait for a promise and then reject the transition", inject(($timeout) => {
      $state.defaultErrorHandler(function() {});
      ctrl.prototype.uiCanExit = function() {
        log += "canexit;";
        return $timeout(() => { log += "delay;"; return false; }, 1000);
      };
      initial();

      $state.go('bar'); $q.flush(); $timeout.flush();
      expect(log).toBe('canexit;delay;');
      expect($state.current.name).toBe('foo');
    }));

    it("can wait for a promise and then allow the transition", inject(($timeout) => {
      ctrl.prototype.uiCanExit = function() {
        log += "canexit;";
        return $timeout(() => { log += "delay;"; }, 1000);
      };
      initial();

      $state.go('bar'); $q.flush(); $timeout.flush();
      expect(log).toBe('canexit;delay;');
      expect($state.current.name).toBe('bar');
    }));

    it("has 'this' bound to the controller", () => {
      ctrl.prototype.uiCanExit = function() { log += this.data; };
      initial();

      $state.go('bar'); $q.flush(); $timeout.flush();
      expect(log).toBe('DATA');
      expect($state.current.name).toBe('bar');
    });

    it("receives the new Transition as the first argument", () => {
      let _state = $state;
      ctrl.prototype.uiCanExit = function(trans) {
        log += "canexit;";
        expect(typeof trans.treeChanges).toBe("function");
        expect(trans.injector().get('$state')).toBe(_state)
      };
      initial();

      $state.go('bar'); $q.flush(); $timeout.flush();
      expect(log).toBe('canexit;');
      expect($state.current.name).toBe('bar');
    });

  });
});