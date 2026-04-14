---
{
  "title": "Contains Duplicate",
  "difficulty": "Easy",
  "order": 1,
  "examples": [
    { "input": "nums = [1,2,3,1]", "output": "true" },
    { "input": "nums = [1,2,3,4]", "output": "false" }
  ],
  "constraints": [
    "1 <= nums.length <= 10^5",
    "-10^9 <= nums[i] <= 10^9"
  ],
  "tags": ["array", "hashset"],
  "leetcodeUrl": "https://leetcode.com/problems/contains-duplicate/"
}
---
Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct. Use a hash set to track seen numbers.
