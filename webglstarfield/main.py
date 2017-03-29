import webapp2

class Main(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'text/html'
        self.response.out.write("""
<!DOCTYPE HTML>
<html lang="en">
	<head>
		<title>WebGL Starfield</title>
		<meta charset="utf-8">
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
        .hidden {
        visibility: hidden;
        opacity: 0;
        transition: visibility 0s 2s, opacity 2s ease;
        }
        </style>
    </head>
    <body>
      <div id = "starfield" style = "z-index: -1; position: fixed; top: 0px; left: 0px; width: 100%; height: 100%;">
      </div>
      <div id="overlay" style = "z-index: 1;">
        <div style="width: 800px; height: 1000px; margin-left: auto; margin-right: auto; background-image: url('bg.png');">
          <div style="margin-left: 20px; margin-top: 10px;">
            <h2>My god it's full of stars!</h2>
            <p>
              The background of this page is - as long as you have the correct browser - full of stars.<br/>
              They are all rendered using webgl.
            </p>
          </div>
        </div>
      </div>

      <script type="text/javascript" src="starfield_min.js"></script>
      <script type="text/javascript">
        var starfield = new Starfield(document.getElementById("starfield"));
        starfield.render();
        setTimeout(function() {
            document.getElementById("overlay").className += "hidden";
        }, 5000);
      </script>
    </body>
</html>
""")

application = webapp2.WSGIApplication([('/', Main)], debug = False)
