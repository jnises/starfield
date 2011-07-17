from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

class Main(webapp.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'text/html'
        self.response.out.write("""
<!DOCTYPE HTML>
<html lang="en">
	<head>
		<title>WebGL Starfield</title>
		<meta charset="utf-8">
        <script type="text/javascript" src="starfield_min.js"></script>
        <style type="text/css">
          body
          {
          background-color: #000000;
          color: #ffffff;
          font-family: arial, sans-serif;
          }
	  a
          {
          color: #dddddd;
          }
        </style>
    </head>
    <body>
      <div id = "starfield" style = "z-index: -1; position: fixed; top: 0px; left: 0px; width: 100%; height: 100%;">
      </div>
      <div style = "z-index: 1;">
        <div style="width: 800px; height: 1000px; margin-left: auto; margin-right: auto; background-image: url('bg.png');">
          <div style="margin-left: 20px; margin-top: 10px;">
            <h2>My god it's full of stars!</h2>
            <p>
              The background of this page is - as long as you have the correct browser - full of stars.<br/>
              They are all rendered using webgl.
            </p>
<p>
The correct browser would in this case be something like <a href="http://firefox.com">Firefox</a> or <a href="http://google.com/chrome">Chrome</a>.<br/>
If you are from the future even Internet Explorer might work.
</p>
            <p>
              If things doesn't work, try refreshing the page.
            </p>
          </div>
        </div>
      </div>

      <script type="text/javascript">
        var starfield = new Starfield(document.getElementById("starfield"));
        starfield.render();
      </script>
    </body>
</html>
""")

application = webapp.WSGIApplication([('/', Main)], debug = False)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
