const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.testSuites = {
      unit: 'Unit Tests',
      integration: 'Integration Tests',
      e2e: 'End-to-End Tests'
    };
  }

  async runTests(suite = 'all', options = {}) {
    console.log('🧪 Twitter Thread Bot - Test Suite Runner\n');
    
    try {
      // Check if Jest is available
      this.checkDependencies();
      
      // Setup test environment
      this.setupTestEnvironment();
      
      if (suite === 'all') {
        console.log('Running all test suites...\n');
        await this.runAllTests(options);
      } else {
        console.log(`Running ${this.testSuites[suite] || suite} tests...\n`);
        await this.runSpecificSuite(suite, options);
      }
      
    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
      process.exit(1);
    }
  }

  checkDependencies() {
    const requiredPackages = ['jest', 'ts-jest', 'supertest'];
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const missing = requiredPackages.filter(pkg => 
      !packageJson.devDependencies[pkg] && !packageJson.dependencies[pkg]
    );
    
    if (missing.length > 0) {
      throw new Error(`Missing test dependencies: ${missing.join(', ')}`);
    }
  }

  setupTestEnvironment() {
    // Ensure test environment file exists
    const testEnvPath = path.join(__dirname, '..', '.env.test');
    if (!fs.existsSync(testEnvPath)) {
      console.log('⚠️  .env.test file not found, using defaults');
    }
    
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    console.log('✅ Test environment configured\n');
  }

  async runAllTests(options) {
    const suites = ['unit', 'integration', 'e2e'];
    let totalPassed = 0;
    let totalFailed = 0;
    
    for (const suite of suites) {
      try {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`🏃 Running ${this.testSuites[suite]}`);
        console.log(`${'='.repeat(50)}\n`);
        
        const result = await this.runSpecificSuite(suite, options);
        totalPassed += result.passed;
        totalFailed += result.failed;
        
      } catch (error) {
        console.error(`❌ ${this.testSuites[suite]} failed:`, error.message);
        totalFailed += 1;
      }
    }
    
    this.printSummary(totalPassed, totalFailed);
  }

  async runSpecificSuite(suite, options = {}) {
    const jestOptions = this.buildJestOptions(suite, options);
    const command = `npx jest ${jestOptions.join(' ')}`;
    
    console.log(`Executing: ${command}\n`);
    
    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: options.verbose ? 'inherit' : 'pipe'
      });
      
      if (!options.verbose) {
        console.log(output);
      }
      
      return this.parseJestOutput(output);
      
    } catch (error) {
      if (error.stdout) {
        console.log(error.stdout);
      }
      if (error.stderr) {
        console.error(error.stderr);
      }
      throw error;
    }
  }

  buildJestOptions(suite, options) {
    const jestOptions = [];
    
    // Test pattern based on suite
    switch (suite) {
      case 'unit':
        jestOptions.push('--testPathPattern=tests/unit');
        break;
      case 'integration':
        jestOptions.push('--testPathPattern=tests/integration');
        break;
      case 'e2e':
        jestOptions.push('--testPathPattern=tests/e2e');
        break;
      default:
        jestOptions.push(`--testPathPattern=${suite}`);
    }
    
    // Coverage options
    if (options.coverage) {
      jestOptions.push('--coverage');
      jestOptions.push('--coverageDirectory=coverage');
    }
    
    // Watch mode
    if (options.watch) {
      jestOptions.push('--watch');
    }
    
    // Verbose output
    if (options.verbose) {
      jestOptions.push('--verbose');
    }
    
    // Bail on first failure
    if (options.bail) {
      jestOptions.push('--bail');
    }
    
    // Run in band (sequential)
    if (options.runInBand) {
      jestOptions.push('--runInBand');
    }
    
    // Silent mode
    if (options.silent) {
      jestOptions.push('--silent');
    }
    
    return jestOptions;
  }

  parseJestOutput(output) {
    // Simple parsing of Jest output to extract pass/fail counts
    const passMatch = output.match(/(\d+) passing/);
    const failMatch = output.match(/(\d+) failing/);
    
    return {
      passed: passMatch ? parseInt(passMatch[1]) : 0,
      failed: failMatch ? parseInt(failMatch[1]) : 0
    };
  }

  printSummary(passed, failed) {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Total:  ${passed + failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log(`\n⚠️  ${failed} test(s) failed`);
    }
    
    console.log('='.repeat(50));
  }

  printHelp() {
    console.log(`
🧪 Twitter Thread Bot Test Runner

Usage: node tests/test-runner.js [suite] [options]

Test Suites:
  all           Run all test suites (default)
  unit          Run unit tests only
  integration   Run integration tests only
  e2e           Run end-to-end tests only

Options:
  --coverage    Generate code coverage report
  --watch       Watch for file changes and re-run tests
  --verbose     Show detailed test output
  --bail        Stop on first test failure
  --run-in-band Run tests sequentially
  --silent      Suppress console output during tests
  --help        Show this help message

Examples:
  node tests/test-runner.js                    # Run all tests
  node tests/test-runner.js unit               # Run unit tests only
  node tests/test-runner.js unit --coverage    # Run unit tests with coverage
  node tests/test-runner.js --watch            # Run all tests in watch mode
  node tests/test-runner.js e2e --verbose      # Run e2e tests with verbose output
`);
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const runner = new TestRunner();
  
  // Parse arguments
  const suite = args.find(arg => !arg.startsWith('--')) || 'all';
  const options = {
    coverage: args.includes('--coverage'),
    watch: args.includes('--watch'),
    verbose: args.includes('--verbose'),
    bail: args.includes('--bail'),
    runInBand: args.includes('--run-in-band'),
    silent: args.includes('--silent'),
    help: args.includes('--help')
  };
  
  if (options.help) {
    runner.printHelp();
    process.exit(0);
  }
  
  runner.runTests(suite, options);
}

module.exports = TestRunner;