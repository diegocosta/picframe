const gulp = require('gulp');
const browserify = require('gulp-browserify');
const rename = require('gulp-rename');

gulp.task('js', () => {
    return gulp.src('js/app.js')
        .pipe(browserify())
        .pipe(rename('app.bundle.js'))
        .pipe(gulp.dest('js'));
});

gulp.task('default', ['js']);

gulp.task('watch', () => {
    gulp.watch('js/app.js', ['js']);
});
